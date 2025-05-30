
"use server";

import type { ScrapedMedicineResult } from '@/types';

interface ActionResult {
  data?: ScrapedMedicineResult[];
  error?: string;
}

const PHARMACY_PLATFORMS = ["Truemeds", "PharmEasy", "Tata 1mg", "Netmeds", "Apollo Pharmacy", "Wellness Forever"];

// MOCK IMPLEMENTATION - Simulates scraping results
export async function searchPharmaciesAction(searchTerm: string): Promise<ActionResult> {
  console.log(`Server Action: Simulating pharmacy search for "${searchTerm}"`);

  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay

  if (searchTerm.toLowerCase().includes("errorplease")) {
    return { error: "Simulated server error: Could not connect to pharmacy aggregators." };
  }
  if (searchTerm.toLowerCase() === "notfound" || searchTerm.trim() === "") {
    return { data: [] };
  }

  const baseDrugName = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
  const mockResults: ScrapedMedicineResult[] = [];

  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate a few results for each platform, or randomly skip some
  PHARMACY_PLATFORMS.forEach(platform => {
    if (Math.random() > 0.3) { // Simulate platform not always having the drug or being scraped
      const numResultsForPlatform = randomInt(1, 2); // 1 or 2 results per "successful" platform

      for (let i = 0; i < numResultsForPlatform; i++) {
        const strengthVariant = ["10mg", "20mg", "500mg", "250mg", "50mg/ml Syrup", "1% Ointment"];
        const packSizeVariant = ["Pack of 10", "Bottle of 100ml", "30 Capsules", "15 Tablets", "Tube of 30g"];
        
        const currentStrength = strengthVariant[randomInt(0, strengthVariant.length - 1)];
        const currentPackSize = packSizeVariant[randomInt(0, packSizeVariant.length - 1)];
        const drugFullName = `${baseDrugName} ${currentStrength} (${currentPackSize})`;

        const price = (randomInt(50, 5000) / 100).toFixed(2);
        const originalPriceNum = parseFloat(price) * (1 + randomInt(10, 40) / 100);
        const originalPrice = Math.random() > 0.4 ? originalPriceNum.toFixed(2) : undefined;
        
        let discount: string | undefined;
        if (originalPrice) {
          discount = `${Math.round(((originalPriceNum - parseFloat(price)) / originalPriceNum) * 100)}% off`;
        } else if (Math.random() < 0.2) {
          discount = `${randomInt(5, 25)}% off`; // Flat discount
        }

        const availabilityStates = ["In Stock", "In Stock - Ships in 24h", "Low Stock", "Out of Stock", "Available on Order"];
        const availability = availabilityStates[randomInt(0, availabilityStates.length - 1)];
        
        const isOutOfStock = availability.toLowerCase().includes('out of stock');
        const addToCartLink = isOutOfStock ? "#" : `https://mock.${platform.toLowerCase().replace(/\s+/g, '')}.com/product/${baseDrugName.toLowerCase()}-${currentStrength.split(' ')[0]}?id=${randomInt(1000,9999)}`;

        mockResults.push({
          pharmacyName: platform,
          drugName: drugFullName,
          price: `₹${price}`,
          originalPrice: originalPrice ? `₹${originalPrice}` : undefined,
          discount,
          availability,
          addToCartLink,
          imageUrl: `https://placehold.co/150x150.png?text=${baseDrugName.substring(0,3)}`, // Keep placeholder generic
        });
      }
    }
  });

  if (mockResults.length === 0 && !searchTerm.toLowerCase().includes("emptytest")) {
     // If random filter made it empty, provide at least one generic result if not a specific "emptytest"
      mockResults.push({
        pharmacyName: "Generic Pharma Listings",
        drugName: `${baseDrugName} (Generic Variant - Check Availability)`,
        price: `₹${(Math.random() * 30 + 5).toFixed(2)}`,
        availability: "Check Availability",
        addToCartLink: "#",
        imageUrl: `https://placehold.co/150x150.png?text=Gen`
      });
  }

  return { data: mockResults };
}
