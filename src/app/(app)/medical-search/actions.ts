
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
  linkSelector?: string; // Optional: CSS selector for the product link element
  linkBaseUrl?: string;  // Optional: Base URL for resolving relative links
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
    // Remove currency symbols (₹, Rs.), commas, and leading/trailing whitespace.
    // Keep the decimal point.
    return priceText.replace(/[₹,Rs.\s]/gi, '').trim();
}

async function scrapePlatform(platformName: string, medicineName: string, config: PlatformConfig, attempt = 1): Promise<ScrapedMedicineResult[]> {
  if (!config || !config.enabled) {
    console.log(`Skipping disabled or misconfigured platform: ${platformName}`);
    return [];
  }
  if (!config.nameClass || !config.priceClass) {
    console.warn(`Platform ${platformName} is enabled but missing nameClass or priceClass selectors in platforms.json. Skipping.`);
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
      console.warn(`No data found on ${platformName} for ${medicineName}. Caching empty result.`);
      medicineCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    
    const potentialProductsOnPage: { name: string; price: string; elementContext: cheerio.Cheerio<cheerio.Element> }[] = [];
    nameElements.each((i, el) => {
      const name = $(el).text().trim();
      // Try to find a corresponding price element.
      // This assumes name and price elements appear in the same order and quantity,
      // or that priceElements are selected relative to nameElements if selectors are structured that way.
      // A common pattern is that price is near the name.
      const priceEl = priceElements.eq(i); // Simplistic correlation by index
      // Alternative: $(el).closest(SOME_PRODUCT_WRAPPER_SELECTOR).find(config.priceClass)
      
      const price = getCleanPrice(priceEl.text().trim());
      if (name && price && price !== "N/A") {
        potentialProductsOnPage.push({ name, price, elementContext: $(el) });
      }
    });

    console.log(`Platform ${platformName}: Created ${potentialProductsOnPage.length} potential product objects from page.`);
    if (potentialProductsOnPage.length === 0) {
        medicineCache.set(cacheKey, { data: [], timestamp: Date.now() });
        return [];
    }

    const fuse = new Fuse(potentialProductsOnPage, {
        keys: ['name'],
        threshold: 0.4, // Adjusted threshold
        includeScore: true,
        minMatchCharLength: Math.max(3, Math.floor(medicineName.length * 0.5)) // Adjusted for more flexibility
    });

    const fuzzyMatches = fuse.search(medicineName); // Search user's term in the names of potentialProductsOnPage
    console.log(`Platform ${platformName}: Fuse.js found ${fuzzyMatches.length} potential matches for "${medicineName}".`);

    const results: ScrapedMedicineResult[] = [];
    for (const match of fuzzyMatches) {
      const product = match.item;
      let productLink = config.linkBaseUrl || url; // Default to search URL or base

      if (config.linkSelector) {
        let linkElement = product.elementContext.closest('a'); // Try closest 'a' to the name element
        if (!linkElement.length) { // If not found, try the configured selector relative to the name element's parent
            linkElement = product.elementContext.parent().find(config.linkSelector);
        }
        // If still not found, try finding it within a common ancestor of name and a hypothetical price element
        if (!linkElement.length) {
            // This assumes nameClass and priceClass elements share a common ancestor that acts as a product card
            const commonAncestor = product.elementContext.parentsUntil((_, elem) => $(elem).find(config.nameClass).length > 0 && $(elem).find(config.priceClass).length > 0).last().parent();
            linkElement = commonAncestor.find(config.linkSelector).first();
             if(!linkElement.length) linkElement = commonAncestor.find('a[href]').first(); // Fallback to any link in common ancestor
        }
        
        const href = linkElement.attr('href');
        if (href) {
            if (href.startsWith('http')) {
                productLink = href;
            } else if (config.linkBaseUrl) {
                try {
                    productLink = new URL(href, config.linkBaseUrl).href;
                } catch (urlError) { /* use default base URL */ }
            } else {
                 productLink = href; // store relative if no base
            }
        }
      } else {
        // Fallback: try to find any link that is an ancestor of the name element
        const ancestorLink = product.elementContext.closest('a');
        if (ancestorLink.length && ancestorLink.attr('href')) {
            const href = ancestorLink.attr('href')!;
             if (href.startsWith('http')) {
                productLink = href;
            } else if (config.linkBaseUrl) {
                 try {
                    productLink = new URL(href, config.linkBaseUrl).href;
                } catch (urlError) { /* use default */ }
            } else {
                productLink = href;
            }
        }
      }

      results.push({
        pharmacyName: platformName,
        drugName: product.name,
        price: product.price, // Already cleaned
        addToCartLink: productLink,
        availability: "Info not available", // This would require more specific selectors per site
        imageUrl: `https://placehold.co/150x150.png?text=${encodeURIComponent(product.name.substring(0,3))}`,
        originalPrice: undefined, // Requires specific selectors
        discount: undefined,      // Requires specific selectors
      });
    }
    
    const finalResults = results.slice(0, 5); // Limit to top 5 relevant results
    console.log(`Platform ${platformName}: Final ${finalResults.length} relevant results for "${medicineName}":`, finalResults.map(r => ({name: r.drugName, price: r.price})));
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
      // No error property here, just an empty data array, UI will handle "no results"
      return { data: [] };
    }
    
    // Optional: Sort all results, e.g., by price if prices are numeric and comparable
    allResults.sort((a, b) => {
        const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
        const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
        if (!isNaN(priceA) && !isNaN(priceB)) {
            if(priceA !== priceB) return priceA - priceB;
        }
        // Fallback sort by drug name if prices are equal or not parseable
        return a.drugName.localeCompare(b.drugName);
    });

    return { data: allResults };

  } catch (err: any) {
    // This catch is for truly unexpected errors in the orchestration logic itself
    console.error("Unexpected error in searchPharmaciesAction orchestrating scrapes:", err);
    return { error: "An unexpected error occurred during the search. Please try again." };
  }
}
