
"use server";

import type { ScrapedMedicineResult } from '@/types';

interface ActionResult {
  data?: ScrapedMedicineResult[];
  error?: string;
}

// MOCK IMPLEMENTATION - Replace with actual web scraping logic
export async function searchPharmaciesAction(searchTerm: string): Promise<ActionResult> {
  console.log(`Server Action: Searching pharmacies for "${searchTerm}" (MOCK)`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simulate potential errors for specific search terms
  if (searchTerm.toLowerCase().includes("errorplease")) {
    return { error: "Simulated server error: Could not connect to pharmacy aggregators." };
  }
  if (searchTerm.toLowerCase().includes("notfound")) {
    return { data: [] }; // Simulate no results
  }

  // Mock data - In a real application, this would come from web scraping
  const mockResults: ScrapedMedicineResult[] = [
    {
      pharmacyName: "Wellness Pharmacy Online",
      drugName: `${searchTerm} 500mg Tablets`,
      price: "12.99",
      originalPrice: "15.50",
      discount: "16% off",
      availability: "In Stock",
      addToCartLink: "#mock-wellness", // Replace with actual links
      imageUrl: "https://placehold.co/100x100.png?text=Med1"
    },
    {
      pharmacyName: "HealthFirst Drugs",
      drugName: `${searchTerm} 20mg Capsules`,
      price: "25.49",
      availability: "In Stock - Ships in 24h",
      addToCartLink: "#mock-healthfirst",
      imageUrl: "https://placehold.co/100x100.png?text=Med2"
    },
    {
      pharmacyName: "City Chemist Direct",
      drugName: `${searchTerm} Syrup 100ml`,
      price: "8.75",
      availability: "Low Stock",
      addToCartLink: "#mock-citychemist",
      imageUrl: "https://placehold.co/100x100.png?text=Med3"
    },
    {
      pharmacyName: "TeleMeds Rx",
      drugName: `${searchTerm} Ointment 30g`,
      price: "18.00",
      originalPrice: "20.00",
      discount: "10% off",
      availability: "Out of Stock",
      addToCartLink: "#", // No link if out of stock perhaps
      imageUrl: "https://placehold.co/100x100.png?text=Med4"
    },
     {
      pharmacyName: "QuickMeds Global",
      drugName: `${searchTerm} Extended Release 100mg`,
      price: "35.99",
      availability: "In Stock",
      addToCartLink: "#mock-quickmeds",
      imageUrl: "https://placehold.co/100x100.png?text=Med5"
    },
  ];

  // Simulate that not all pharmacies will have every drug
  const filteredMockResults = mockResults.filter(() => Math.random() > 0.3); // Randomly include results

  if (filteredMockResults.length === 0 && !searchTerm.toLowerCase().includes("notfound")) {
     // If random filter made it empty, provide at least one generic result if not a specific "notfound" test
      return { data: [{
        pharmacyName: "General Pharma Listings",
        drugName: `${searchTerm} (Generic Variant)`,
        price: (Math.random() * 30 + 5).toFixed(2), // Random price
        availability: "Check Availability",
        addToCartLink: "#",
        imageUrl: "https://placehold.co/100x100.png?text=Generic"
      }]};
  }


  return { data: filteredMockResults };
}
