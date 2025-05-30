
"use server";

import type { ScrapedMedicineResult } from '@/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Fuse from 'fuse.js';

interface ActionResult {
  data?: ScrapedMedicineResult[];
  error?: string;
}

interface PlatformConfig {
  url: (medicine: string) => string;
  nameClass: string;
  priceClass: string;
  // Optional: Selectors for image, original price, discount, availability, add to cart link
  imageClass?: string;
  originalPriceClass?: string;
  discountClass?: string;
  availabilityClass?: string;
  linkSelector?: string; // Selector for the product link itself
  linkBaseUrl?: string; // Base URL if link is relative
}

const platforms: Record<string, PlatformConfig> = {
  "Truemeds": {
    url: (medicine) => `https://www.truemeds.in/search/${encodeURIComponent(medicine)}`,
    nameClass: ".sc-a39eeb4f-12.daYLth", // These selectors are from your example
    priceClass: ".sc-a39eeb4f-17.iwZSqt",
    linkSelector: "a[href^='/product/']", // Example, needs verification
    linkBaseUrl: "https://www.truemeds.in",
  },
  "PharmEasy": {
    url: (medicine) => `https://pharmeasy.in/search/all?name=${encodeURIComponent(medicine)}`,
    nameClass: ".ProductCard_medicineName__Uzjm7",
    priceClass: ".ProductCard_unitPriceDecimal__Ur26V", // This might be just the decimal part.
    // Price might be combination of .ProductCard_gcdDiscountContainer__KqYTG and .ProductCard_unitPriceDecimal__Ur26V
    // Or .ProductCard_mrpPrice__5vJdM and .ProductCard_majorDiscountPrice__7ZzVb
    // PharmEasy selectors are complex and might need more specific handling for full price.
    linkSelector: ".ProductCard_productCardContainer__dT8SA", // The whole card is usually a link
    linkBaseUrl: "https://pharmeasy.in",
  },
  "Tata 1mg": {
    url: (medicine) => `https://www.1mg.com/search/all?filter=true&name=${encodeURIComponent(medicine)}`,
    nameClass: ".style__pro-title___3G3rr",
    priceClass: ".style__price-tag___KzOkY",
    linkSelector: ".style__product-link___1hWpa",
    linkBaseUrl: "https://www.1mg.com",
  },
  "Netmeds": {
    url: (medicine) => `https://www.netmeds.com/catalogsearch/result?q=${encodeURIComponent(medicine)}`, // Adjusted URL q parameter
    nameClass: ".clsgetname",
    priceClass: ".final-price",
    linkSelector: ".category_name > a",
    linkBaseUrl: "https://www.netmeds.com",
  }
};

async function scrapePlatform(platformName: string, medicineName: string, config: PlatformConfig): Promise<ScrapedMedicineResult[]> {
  console.log(`Scraping ${platformName} for ${medicineName} at URL: ${config.url(medicineName)}`);
  try {
    const { data } = await axios.get(config.url(medicineName), {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        // Some sites might need more headers like Accept-Encoding, Referer, etc.
      },
      timeout: 15000 // 15 seconds timeout
    });

    const $ = cheerio.load(data);
    const results: ScrapedMedicineResult[] = [];
    const productElements: cheerio.Element[] = [];

    // Generic approach: find common ancestor of name and price if they are separate
    // This is highly dependent on specific site structure and may need refinement per site.
    // For now, we assume name and price are within iterable "product" blocks.
    // A more robust way is to identify product blocks first.
    // Let's try to find product blocks based on name selector's parent or a common wrapper.
    // This part is heuristic and might need adjustment per platform.

    let nameElements: cheerio.Cheerio<cheerio.Element>;
    let priceElements: cheerio.Cheerio<cheerio.Element>;

    // Tata 1mg specific selector logic: Product items seem to be within `div.style__product-card___1gbex`
    // PharmEasy: Product items `div.ProductCard_productCardContainer__dT8SA`
    // Truemeds: Items in `div.sc-a39eeb4f-0.sc-a39eeb4f-1.cvyqGw.fepYFX` (this may vary)
    // Netmeds: Items in `li.ais-InfiniteHits-item`

    // This is a simplified example; real-world scraping needs more robust item block detection.
    // For this implementation, we'll rely on the name and price selectors directly and zip them,
    // assuming they appear in corresponding order for each item.
    
    nameElements = $(config.nameClass);
    priceElements = $(config.priceClass);
    
    const extractedItems: {name: string, price: string, elementContext: cheerio.Cheerio<cheerio.Element>}[] = [];

    nameElements.each((i, el) => {
      const name = $(el).text().trim();
      const priceEl = priceElements.eq(i); // Assume corresponding price
      const price = priceEl.text().trim();
      if (name && price) {
        extractedItems.push({ name, price, elementContext: $(el) });
      }
    });


    console.log(`Platform ${platformName}: Found ${extractedItems.length} potential items.`);

    if (extractedItems.length === 0) {
      console.warn(`No data pairs (name/price) found on ${platformName} for ${medicineName} using selectors: Name='${config.nameClass}', Price='${config.priceClass}'.`);
      return [];
    }

    const fuse = new Fuse(extractedItems.map(item => item.name), { 
        threshold: 0.4, // Adjust threshold for fuzziness
        includeScore: true,
        minMatchCharLength: Math.min(3, medicineName.length / 2), // Require some overlap
     });
    const searchTermLower = medicineName.toLowerCase();

    for (const item of extractedItems) {
      const nameLower = item.name.toLowerCase();
      // Check for exact or partial substring match first
      if (nameLower.includes(searchTermLower)) {
        // Attempt to find a link. This needs to be relative to the item's context.
        let productLink = config.linkBaseUrl || '';
        if (config.linkSelector) {
            // Try to find the link within the name element's parent or a product block
            const linkElement = item.elementContext.closest('a').attr('href') || item.elementContext.find(config.linkSelector).attr('href') || item.elementContext.parentsUntil( (idx, elem) => $(elem).find(config.nameClass).length > 0 && $(elem).find(config.priceClass).length > 0 ).first().find('a').attr('href');
            if (linkElement) {
                if (linkElement.startsWith('http')) {
                    productLink = linkElement;
                } else if (config.linkBaseUrl) {
                    productLink = new URL(linkElement, config.linkBaseUrl).href;
                }
            } else {
                 productLink = config.url(medicineName); // Fallback to search URL
            }
        } else {
            productLink = config.url(medicineName); // Fallback to search URL
        }

        results.push({
          pharmacyName: platformName,
          drugName: item.name,
          price: item.price.replace(/[^0-9.,₹]/g, '').replace('₹', '').trim() || "N/A", // Clean price
          addToCartLink: productLink,
          availability: "Info not available", // Default
          imageUrl: `https://placehold.co/150x150.png?text=${item.name.substring(0,3)}`,
          originalPrice: undefined,
          discount: undefined,
        });
      }
      // Fuzzy matching as a fallback (can be less accurate)
      // else {
      //   const fuzzyMatches = fuse.search(item.name);
      //   if (fuzzyMatches.length > 0 && fuzzyMatches[0].score && fuzzyMatches[0].score < 0.5 && fuzzyMatches[0].item.toLowerCase().includes(searchTermLower)) {
      //      // Add to results with a note about fuzzy match if desired
      //   }
      // }
    }
    
    // Simple fuzzy filter on results if needed, or rely on initial check
    const fuseResults = new Fuse(results.map(r => r.drugName), { threshold: 0.6, includeScore: true });
    const finalFilteredResults = results.filter(r => {
        const match = fuseResults.search(r.drugName);
        // Basic check: ensure the original search term is somewhat present in the found drug name
        return r.drugName.toLowerCase().includes(searchTermLower) || (match.length > 0 && (match[0].score || 1) < 0.6);
    });


    console.log(`Platform ${platformName}: After filtering, ${finalFilteredResults.length} relevant items.`);
    return finalFilteredResults.slice(0, 5); // Limit to 5 results per platform

  } catch (error: any) {
    console.error(`Error scraping ${platformName} for ${medicineName}: ${error.message}`, error.stack);
    // Check if it's a timeout error
    if (axios.isCancel(error)) {
      console.error(`${platformName} request cancelled: ${error.message}`);
    } else if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 408)) {
      console.error(`${platformName} request timed out.`);
    } else if (error.response) {
      console.error(`${platformName} responded with status ${error.response.status}: ${error.response.data ? JSON.stringify(error.response.data).substring(0,100) : ''}`);
    }
    return []; // Return empty array on error
  }
}

export async function searchPharmaciesAction(searchTerm: string): Promise<ActionResult> {
  if (!searchTerm.trim()) {
    return { error: "Please enter a medicine name to search." };
  }
  console.log(`Server Action: Starting REAL pharmacy search for "${searchTerm}"`);

  let allResults: ScrapedMedicineResult[] = [];
  const platformPromises: Promise<ScrapedMedicineResult[]>[] = [];

  for (const [platformName, config] of Object.entries(platforms)) {
    platformPromises.push(scrapePlatform(platformName, searchTerm, config));
  }

  try {
    const settledResults = await Promise.allSettled(platformPromises);
    
    settledResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allResults = allResults.concat(result.value);
      } else if (result.status === 'rejected') {
        console.error("A platform scraping promise was rejected:", result.reason);
      }
    });

    console.log(`Server Action: Total results from all platforms for "${searchTerm}": ${allResults.length}`);
    
    if (allResults.length === 0) {
      return { data: [] }; // No results found overall
    }
    // Basic sorting: by price, then by name (ensure price is a number for sorting)
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
