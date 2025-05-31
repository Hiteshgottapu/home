
'use server';

import type { ScrapedMedicineResult } from '@/types';
import axios from 'axios';
import * as io from 'cheerio'; // Corrected import
import Fuse from 'fuse.js';
import fs from 'fs/promises';
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

let platforms: Platforms = {};
let platformsLoaded = false;
const CACHE_TTL_MS = 60 * 60 * 1000 * 3; // 3 hours
const platformCache = new Map<string, { data: ScrapedMedicineResult[]; timestamp: number }>();

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadPlatformConfigs(): Promise<Platforms> {
  if (platformsLoaded) return platforms;
  try {
    const platformConfigPath = path.join(process.cwd(), 'src', 'app', '(app)', 'medical-search', 'platforms.json');
    const platformConfigData = await fs.readFile(platformConfigPath, 'utf-8');
    platforms = JSON.parse(platformConfigData);
    platformsLoaded = true;
    console.log("Successfully loaded platform configurations from platforms.json.");
    return platforms;
  } catch (error) {
    console.error("Failed to load platform configurations from platforms.json:", error);
    platformsLoaded = true;
    return {};
  }
}

function getCleanPrice(priceText: string | undefined): string {
  if (!priceText) return "N/A";
  return priceText.replace(/[₹,Rs.\s]/g, '').trim();
}

async function scrapePlatform(
  platformName: string,
  medicineName: string,
  config: PlatformConfig,
  attempt = 1
): Promise<ScrapedMedicineResult[]> {
  if (!config || !config.enabled) {
    console.log(`Skipping disabled or misconfigured platform: ${platformName}`);
    return [];
  }
  if (!config.nameClass || !config.priceClass) {
    console.warn(`Platform ${platformName} is enabled but missing nameClass or priceClass selectors in platforms.json. Skipping.`);
    return [];
  }

  const cacheKey = `${platformName}-${medicineName.toLowerCase()}`;
  const cachedEntry = platformCache.get(cacheKey);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
    console.log(`[CACHE HIT] Serving from cache for ${platformName} - ${medicineName}`);
    return cachedEntry.data;
  }
  console.log(`[CACHE MISS] Scraping ${platformName} for ${medicineName} (Attempt ${attempt})`);

  try {
    const url = config.urlTemplate.replace('{medicine}', encodeURIComponent(medicineName));
    console.log(`Scraping URL: ${url} for ${platformName}`);

    const { data } = await axios.get(url, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 15000,
    });

    const $ = io.load(data); // Corrected usage

    const nameElements = $(config.nameClass);
    const priceElements = $(config.priceClass);

    console.log(`Platform ${platformName}: Found ${nameElements.length} name elements using selector '${config.nameClass}'.`);
    console.log(`Platform ${platformName}: Found ${priceElements.length} price elements using selector '${config.priceClass}'.`);

    const potentialProductsOnPage: { name: string; price: string; elementContext: io.Cheerio<io.Element> }[] = [];

    nameElements.each((index, nameEl) => {
      const name = $(nameEl).text().trim();
      // Try to find price relative to the name element first, then fall back to direct priceElements indexing
      let priceElement = $(nameEl).closest(':has(>' + config.priceClass + ')').find(config.priceClass).first();
      if (!priceElement.length && priceElements[index]) {
          priceElement = $(priceElements[index]);
      }
      const price = getCleanPrice(priceElement.text().trim());

      if (name) {
        potentialProductsOnPage.push({
          name: name,
          price: price || "N/A",
          elementContext: $(nameEl)
        });
      }
    });
    console.log(`Platform ${platformName}: Created ${potentialProductsOnPage.length} potential product objects.`);


    if (potentialProductsOnPage.length === 0) {
      console.warn(`No potential products extracted on ${platformName} for ${medicineName}.`);
      platformCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }

    const fuse = new Fuse(potentialProductsOnPage, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: Math.max(2, Math.floor(medicineName.length * 0.5)),
    });

    const fuzzyMatches = fuse.search(medicineName);
    console.log(`Platform ${platformName}: Fuse.js found ${fuzzyMatches.length} potential matches for "${medicineName}".`);

    const results: ScrapedMedicineResult[] = [];
    const addedProductNames = new Set<string>();

    for (const match of fuzzyMatches) {
      if (results.length >= 5) break;

      const product = match.item;
      if (product.name && product.price !== "N/A" && !addedProductNames.has(product.name.toLowerCase())) {
        let productLink: string | undefined = undefined;
        // Try to find link using config.linkSelector relative to the product name's context
        if (config.linkSelector) {
          const linkEl = product.elementContext.closest(config.linkSelector).attr('href') || 
                         product.elementContext.find(config.linkSelector).attr('href');
          if (linkEl) {
            productLink = config.linkBaseUrl && !linkEl.startsWith('http') ? new URL(linkEl, config.linkBaseUrl).href : linkEl;
          }
        }
        // Fallback: try to find closest 'a' tag to the name element
        if (!productLink) {
            const ancestorAnchor = product.elementContext.closest('a');
            if (ancestorAnchor.length > 0 && ancestorAnchor.attr('href')) {
                productLink = ancestorAnchor.attr('href');
                 if (productLink && config.linkBaseUrl && !productLink.startsWith('http')) {
                    productLink = new URL(productLink, config.linkBaseUrl).href;
                }
            }
        }
        // Fallback: check if parent of name element is an anchor
         if (!productLink && product.elementContext.parent().is('a')) {
            productLink = product.elementContext.parent().attr('href');
            if (productLink && config.linkBaseUrl && !productLink.startsWith('http')) {
                productLink = new URL(productLink, config.linkBaseUrl).href;
            }
        }

        results.push({
          pharmacyName: platformName,
          drugName: product.name,
          price: product.price,
          addToCartLink: productLink || undefined,
          imageUrl: `https://placehold.co/100x100.png?text=${encodeURIComponent(product.name.substring(0,10))}`,
        });
        addedProductNames.add(product.name.toLowerCase());
      }
    }
    console.log(`Platform ${platformName}: Filtered down to ${results.length} relevant results for "${medicineName}".`);

    platformCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;

  } catch (error: any) {
    console.error(`Error scraping ${platformName} for ${medicineName} (Attempt ${attempt}):`, error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data || error.message).substring(0, 200)}`);
    }
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying scrape for ${platformName} - ${medicineName} in ${RETRY_DELAY_MS * attempt}ms...`);
      await sleep(RETRY_DELAY_MS * attempt);
      return scrapePlatform(platformName, medicineName, config, attempt + 1);
    } else {
      console.error(`Max retries reached for ${platformName} - ${medicineName}. Giving up.`);
      platformCache.set(cacheKey, { data: [], timestamp: Date.now() });
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

  const currentPlatforms = await loadPlatformConfigs();
  if (Object.keys(currentPlatforms).length === 0) {
    console.error("Server Action: No platforms loaded. Aborting search.");
    return { error: "Platform configurations could not be loaded. Please check server logs or platforms.json." };
  }

  let allResults: ScrapedMedicineResult[] = [];
  const scrapingPromises: Promise<ScrapedMedicineResult[]>[] = [];

  for (const [platformName, config] of Object.entries(currentPlatforms)) {
    if (config.enabled) {
      scrapingPromises.push(
        scrapePlatform(platformName, trimmedMedicineName, config)
          .catch(err => {
            console.error(`Critical error in scrapePlatform promise for ${platformName}: ${err.message}`);
            return [];
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
      return { data: [], error: `No results found for "${trimmedMedicineName}" across all enabled platforms. This could be due to outdated selectors in platforms.json, network issues, or the medicine not being listed.` };
    }

    return { data: allResults };

  } catch (err: any) {
    console.error("Unexpected error in searchPharmaciesAction orchestrating scrapes:", err);
    return { error: "An unexpected error occurred during the search. Please try again." };
  }
}
    