
"use server";

import type { ScrapedMedicineResult } from '@/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Fuse from 'fuse.js';
import fs from 'fs';
import path from 'path';

interface PlatformConfig {
  urlTemplate: string;
  nameClass: string;
  priceClass: string;
  linkSelector?: string;
  linkBaseUrl?: string;
  enabled: boolean;
}

interface Platforms {
  [key: string]: PlatformConfig;
}

const CACHE_TTL_SECONDS = 60 * 60 * 3; // Cache results for 3 hours
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Simple in-memory cache
const medicineCache = new Map<string, { data: ScrapedMedicineResult[]; timestamp: number }>();

function loadPlatformConfigs(): Platforms {
  try {
    const platformConfigPath = path.join(process.cwd(), 'src', 'app', '(app)', 'medical-search', 'platforms.json');
    const platformConfigData = fs.readFileSync(platformConfigPath, 'utf-8');
    console.log("Successfully loaded platform configurations from platforms.json.");
    return JSON.parse(platformConfigData);
  } catch (error) {
    console.error("Failed to load platform configurations from platforms.json:", error);
    return {}; // Fallback to empty if loading fails
  }
}

const platforms: Platforms = loadPlatformConfigs();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCleanPrice(priceText?: string): string {
    if (!priceText) return "N/A";
    return priceText.replace(/[₹,Rs.\s]/gi, '').trim();
}

async function scrapePlatform(platformName: string, medicineName: string, config: PlatformConfig, attempt = 1): Promise<ScrapedMedicineResult[]> {
  if (!config || !config.enabled) {
    console.log(`Skipping disabled or misconfigured platform: ${platformName}`);
    return [];
  }

  const cacheKey = `${platformName}-${medicineName}`;
  const cachedEntry = medicineCache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_TTL_SECONDS * 1000) {
    console.log(`[CACHE HIT] Serving from cache for ${platformName} - ${medicineName}`);
    return cachedEntry.data;
  }
  console.log(`[CACHE MISS] Scraping ${platformName} for ${medicineName} (Attempt ${attempt})`);

  try {
    const url = config.urlTemplate.replace('{medicine}', encodeURIComponent(medicineName));
    console.log(`Scraping URL: ${url} for platform ${platformName}`);
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 15000 // Increased timeout
    });

    const $ = cheerio.load(data);
    const nameElements = $(config.nameClass);
    const priceElements = $(config.priceClass);

    console.log(`Platform ${platformName}: Found ${nameElements.length} name elements using selector "${config.nameClass}" and ${priceElements.length} price elements using selector "${config.priceClass}".`);

    if (nameElements.length === 0 || priceElements.length === 0) {
      console.warn(`No data found on ${platformName} for ${medicineName}.`);
      medicineCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    
    const extractedItems: {name: string, price: string, elementContext: cheerio.Cheerio<cheerio.Element>}[] = [];
     nameElements.each((i, el) => {
      const name = $(el).text().trim();
      const priceEl = priceElements.eq(i);
      const price = getCleanPrice(priceEl.text().trim());
      if (name && price && price !== "N/A") {
        extractedItems.push({ name, price, elementContext: $(el) });
      }
    });

    console.log(`Platform ${platformName}: Extracted ${extractedItems.length} potential items with both name and price.`);
    if (extractedItems.length === 0) {
        medicineCache.set(cacheKey, { data: [], timestamp: Date.now() });
        return [];
    }

    const fuse = new Fuse(extractedItems.map(item => item.name), {
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: Math.max(3, Math.floor(medicineName.length * 0.6))
    });
    const searchTermLower = medicineName.toLowerCase();
    const results: ScrapedMedicineResult[] = [];

    for (const item of extractedItems) {
      const nameLower = item.name.toLowerCase();
      let isMatch = false;

      if (nameLower.includes(searchTermLower)) {
          isMatch = true;
      } else {
          const fuzzyMatches = fuse.search(item.name); // Search current item.name in the list of scraped names
          if (fuzzyMatches.length > 0 && fuzzyMatches[0].item.toLowerCase().includes(searchTermLower) && (fuzzyMatches[0].score ?? 1) < 0.4) {
             // If the best fuzzy match for item.name still contains the search term and has a good score
             isMatch = true;
          }
      }
      
      if (isMatch) {
        let productLink = config.linkBaseUrl || url; // Default to search URL or base
        if (config.linkSelector) {
            let linkElement = item.elementContext.closest('a');
            if (!linkElement.length) linkElement = item.elementContext.parent().find(config.linkSelector);
             if (!linkElement.length) {
                const commonAncestor = item.elementContext.parentsUntil((_, elem) => $(elem).find(config.nameClass).length > 0 && $(elem).find(config.priceClass).length > 0).last().parent();
                linkElement = commonAncestor.find(config.linkSelector).first(); // Try specific selector on common ancestor
                if(!linkElement.length) linkElement = commonAncestor.find('a[href]').first(); // Fallback to any link
            }
            
            const href = linkElement.attr('href');
            if (href) {
                if (href.startsWith('http')) {
                    productLink = href;
                } else if (config.linkBaseUrl) {
                    try {
                        productLink = new URL(href, config.linkBaseUrl).href;
                    } catch (urlError) { /* use default */ }
                } else {
                     productLink = href; // relative
                }
            }
        }

        results.push({
          pharmacyName: platformName,
          drugName: item.name,
          price: item.price,
          addToCartLink: productLink,
          availability: "Info not available", // This would require more specific selectors per site
          imageUrl: `https://placehold.co/150x150.png?text=${encodeURIComponent(item.name.substring(0,3))}`,
          originalPrice: undefined,
          discount: undefined,
        });
      }
    }
    
    const finalResults = results.slice(0, 5);
    console.log(`Successfully scraped and filtered ${finalResults.length} items from ${platformName} for ${medicineName}`);
    medicineCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });
    return finalResults;

  } catch (error: any) {
    console.error(`Error scraping ${platformName} for ${medicineName} (Attempt ${attempt}):`, error.message);
    if (error.response) {
        console.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data || error.message).substring(0, 200)}`);
    }
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying scrape for ${platformName} - ${medicineName} in ${RETRY_DELAY_MS * attempt}ms...`);
      await sleep(RETRY_DELAY_MS * attempt);
      return scrapePlatform(platformName, medicineName, config, attempt + 1);
    } else {
      console.error(`Max retries reached for ${platformName} - ${medicineName}. Giving up.`);
      medicineCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
  }
}

export async function searchPharmaciesAction(searchTerm: string): Promise<{ data?: ScrapedMedicineResult[]; error?: string }> {
  if (!searchTerm.trim()) {
    return { error: "Please enter a medicine name to search." };
  }
  const trimmedMedicineName = searchTerm.trim();
  console.log(`Server Action: Starting pharmacy search for "${trimmedMedicineName}"`);

  let allResults: ScrapedMedicineResult[] = [];
  const scrapingPromises: Promise<ScrapedMedicineResult[]>[] = [];

  for (const [platformName, config] of Object.entries(platforms)) {
    if (config.enabled) {
      scrapingPromises.push(
        scrapePlatform(platformName, trimmedMedicineName, config)
          .catch(err => {
            console.error(`Critical error in scrapePlatform promise for ${platformName}: ${err.message}`);
            return []; // Return empty array for this platform on critical failure
          })
      );
    } else {
      console.log(`Skipping disabled platform: ${platformName}`);
    }
  }

  try {
    const platformResultsArray = await Promise.all(scrapingPromises);
    platformResultsArray.forEach(platformResults => {
      allResults = allResults.concat(platformResults);
    });

    console.log(`Server Action: Total results from all platforms for "${trimmedMedicineName}": ${allResults.length}`);
    
    if (allResults.length === 0) {
      return { data: [] };
    }
    
    allResults.sort((a, b) => {
        const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
        const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
        if (!isNaN(priceA) && !isNaN(priceB)) {
            if(priceA !== priceB) return priceA - priceB;
        }
        return a.drugName.localeCompare(b.drugName);
    });

    return { data: allResults };

  } catch (err: any) {
    console.error("Unexpected error in searchPharmaciesAction orchestrating scrapes:", err);
    return { error: "An unexpected error occurred during the search. Please try again." };
  }
}
