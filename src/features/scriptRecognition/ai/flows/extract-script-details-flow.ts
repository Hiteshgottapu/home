'use server';
/**
 * @fileOverview Extracts structured details from a script/prescription image using Genkit and Gemini,
 * and enriches medication data with prices by instructing the AI to use a price-fetching tool.
 *
 * - extractScriptDetails - A function that takes an image (as a data URI) and returns extracted details including medication prices.
 * - ExtractScriptDetailsInput - The input type for the extractScriptDetails function.
 * - ExtractScriptDetailsOutput - The return type for the extractScriptDetails function.
 */

import {ai} from '@/ai/genkit'; // Use the existing ai instance
import {z} from 'genkit';
import axios from 'axios';

// Configuration for the price scraping API
const PRICE_SCRAPER_API_URL = process.env.PRICE_SCRAPER_API_URL || 'http://localhost:5000/api/search_medicine_prices';

const PharmacyPriceSchema = z.object({
  pharmacy: z.string().describe('Name of the pharmacy.'),
  name: z.string().describe('Name of the medicine as listed by the pharmacy.'),
  price: z.string().describe('Price of the medicine at the pharmacy.'),
});

// Tool's output schema for fetching prices for a single medicine
const MedicinePricesToolOutputSchema = z.object({
  prices: z.array(PharmacyPriceSchema).optional().describe('List of prices found for the medication, or undefined/empty if none found.')
});

// Define the tool for fetching medicine prices
const fetchMedicinePricesTool = ai.defineTool(
  {
    name: 'fetchMedicinePricesTool',
    description: 'Fetches current prices for a given medicine name from various online pharmacies. Use this tool for each medication found in the prescription.',
    inputSchema: z.object({
      medicineName: z.string().describe('The exact name of the medicine to search prices for.'),
    }),
    outputSchema: MedicinePricesToolOutputSchema,
  },
  async (input) => { // The tool's handler function
    if (!input.medicineName || input.medicineName.trim() === "") {
      console.warn('fetchMedicinePricesTool: Received empty medicine name.');
      return { prices: [] };
    }
    try {
      console.log(`fetchMedicinePricesTool: Fetching prices for medication: "${input.medicineName}"`);
      type ScraperResponseItem = { pharmacy: string; name: string; price: string };

      const response = await axios.get<ScraperResponseItem[]>(
        PRICE_SCRAPER_API_URL,
        {
          params: { medicine_name: input.medicineName },
          timeout: 15000,
        }
      );

      if (response.status === 200 && Array.isArray(response.data)) {
        const validPrices: z.infer<typeof PharmacyPriceSchema>[] = [];
        for (const item of response.data) {
          try {
            validPrices.push(PharmacyPriceSchema.parse(item));
          } catch (validationError) {
            console.warn(`fetchMedicinePricesTool: Price item for ${input.medicineName} from ${item.pharmacy} failed validation:`, validationError);
          }
        }
        return { prices: validPrices };
      } else if (response.status === 404) {
        console.log(`fetchMedicinePricesTool: No prices found for "${input.medicineName}" (scraper API returned 404).`);
        return { prices: [] };
      } else {
        console.warn(`fetchMedicinePricesTool: Unexpected status code ${response.status} when fetching prices for "${input.medicineName}".`);
        return { prices: [] };
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        console.log(`fetchMedicinePricesTool: No prices found for "${input.medicineName}" (API call resulted in 404).`);
      } else {
        console.error(`fetchMedicinePricesTool: Error fetching prices for "${input.medicineName}":`, error.message);
      }
      return { prices: [] }; // On error, return empty prices
    }
  }
);

const MedicationSchema = z.object({
  name: z.string().describe('The name of the medication.'),
  dosage: z.string().optional().describe('The dosage of the medication (e.g., "10mg", "1 tablet").'),
  frequency: z.string().optional().describe('The frequency of administration (e.g., "once daily", "2 times a day").'),
  notes: z.string().optional().describe('Any other relevant notes for this specific medication (e.g., "after food", "for 7 days").'),
  prices: z.array(PharmacyPriceSchema).optional().describe('List of prices found for this medication from various pharmacies. This should be populated by using the fetchMedicinePricesTool.')
});

const ExtractScriptDetailsInputSchema = z.object({
  scriptImageUri: z
    .string()
    .describe(
      "A photo of a medical script or prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractScriptDetailsInput = z.infer<typeof ExtractScriptDetailsInputSchema>;

const ExtractScriptDetailsOutputSchema = z.object({
  patientName: z.string().optional().describe('The name of the patient, if identifiable.'),
  doctorName: z.string().optional().describe('The name of the prescribing doctor, if identifiable.'),
  prescriptionDate: z.string().optional().describe('The date the prescription was issued, if identifiable (e.g., YYYY-MM-DD).'),
  medications: z
    .array(MedicationSchema)
    .describe('A list of extracted medication details, including pricing information obtained via the provided tool.'),
  overallConfidence: z
    .number()
    .optional()
    .describe(
      'An overall confidence level (0-1) for the entire extraction, if the model can provide it.'
    ),
  unclearSections: z.array(z.string()).optional().describe("List of any sections or terms that were difficult to decipher."),
});
export type ExtractScriptDetailsOutput = z.infer<typeof ExtractScriptDetailsOutputSchema>;

// This prompt will now instruct the AI to use the tool
const extractScriptDetailsPrompt = ai.definePrompt(
  {
    name: 'extractScriptDetailsWithPriceToolPrompt',
    input: { schema: ExtractScriptDetailsInputSchema },
    output: { schema: ExtractScriptDetailsOutputSchema }, // The LLM is expected to produce this complete output after tool use
    tools: [fetchMedicinePricesTool], // Make the tool available to the LLM
    prompt: `You are an AI assistant specialized in analyzing medical prescription images and extracting structured information.
Analyze the provided image of a medical script or prescription.

Image: {{media url=scriptImageUri}}

Extract the following details as accurately as possible:
1.  Patient's Name (if clearly visible)
2.  Prescribing Doctor's Name (if clearly visible)
3.  Date of Prescription (if clearly visible, format as YYYY-MM-DD)
4.  A list of all medications. For each medication, provide:
    - Name of the medication.
    - Dosage (e.g., "10mg", "1 tablet", "5ml").
    - Frequency (e.g., "once daily", "twice a day before meals", "every 6 hours").
    - Any other short, relevant notes for that specific medication (e.g. "for 7 days", "if needed for pain").
    - For EACH medication identified, you MUST use the 'fetchMedicinePricesTool' to get its current market prices. Include these prices in the 'prices' array for that medication. If the tool returns no prices, the 'prices' array should be empty.
5.  If possible, provide an overall confidence score (0 to 1) for the accuracy of the entire extraction.
6.  List any specific words, names, or sections that were particularly unclear or illegible.

Focus on accuracy and structure. If a piece of information is not clearly visible or legible, omit it or explicitly state it's unclear in the 'unclearSections' field rather than guessing.
Ensure your output strictly adheres to the JSON schema provided for the output, including the pricing information obtained from the tool.
`,
  },
  // Optional: Custom model configuration if needed, e.g., specific Gemini model
  // { model: geminiPro, generationConfig: { temperature: 0.2 } }
);


export async function extractScriptDetails(
  input: ExtractScriptDetailsInput
): Promise<ExtractScriptDetailsOutput> {
  return extractScriptDetailsFlow(input);
}

const extractScriptDetailsFlow = ai.defineFlow(
  {
    name: 'extractScriptDetailsAgenticFlow',
    inputSchema: ExtractScriptDetailsInputSchema,
    outputSchema: ExtractScriptDetailsOutputSchema,
  },
  async (input: ExtractScriptDetailsInput): Promise<ExtractScriptDetailsOutput> => {
    console.log('extractScriptDetailsAgenticFlow: Starting flow with input:', input.scriptImageUri.substring(0,50) + "..."); // Log start

    // The prompt invocation now includes the 'tools' implicitly from its definition.
    // Genkit will handle the multi-turn interaction if the LLM decides to use the tool.
    const llmResponse = await extractScriptDetailsPrompt(input); // Pass the input directly

    if (!llmResponse || !llmResponse.output) {
      console.error('extractScriptDetailsAgenticFlow: LLM did not return an output after potential tool use.');
      return {
        medications: [],
        unclearSections: ["The AI model did not return any structured data. This could be due to image quality, content policy, or issues with tool interaction."]
      };
    }

    console.log('extractScriptDetailsAgenticFlow: Received final output from LLM:', JSON.stringify(llmResponse.output, null, 2));
    // The output from the prompt should now directly conform to ExtractScriptDetailsOutputSchema,
    // including prices if the LLM successfully used the tool.
    return llmResponse.output;
  }
);