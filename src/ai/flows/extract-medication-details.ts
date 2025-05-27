'use server';
/**
 * @fileOverview Extracts medication details from a prescription image using AI.
 *
 * - extractMedicationDetails - A function that takes a prescription image (as a data URI) and returns extracted medication details.
 * - ExtractMedicationDetailsInput - The input type for the extractMedicationDetails function.
 * - ExtractMedicationDetailsOutput - The return type for the extractMedicationDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractMedicationDetailsInputSchema = z.object({
  prescriptionDataUri: z
    .string()
    .describe(
      "A photo of a prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractMedicationDetailsInput = z.infer<typeof ExtractMedicationDetailsInputSchema>;

const ExtractMedicationDetailsOutputSchema = z.object({
  medicationDetails: z
    .array(
      z.object({
        name: z.string().describe('The name of the medication.'),
        dosage: z.string().describe('The dosage of the medication.'),
        frequency: z.string().describe('The frequency of the medication.'),
      })
    )
    .describe('A list of extracted medication details.'),
  ocrConfidence: z
    .number()
    .describe(
      'The confidence level of the OCR extraction, as a number between 0 and 1.'
    ),
});
export type ExtractMedicationDetailsOutput = z.infer<typeof ExtractMedicationDetailsOutputSchema>;

export async function extractMedicationDetails(
  input: ExtractMedicationDetailsInput
): Promise<ExtractMedicationDetailsOutput> {
  return extractMedicationDetailsFlow(input);
}

const extractMedicationDetailsPrompt = ai.definePrompt({
  name: 'extractMedicationDetailsPrompt',
  input: {schema: ExtractMedicationDetailsInputSchema},
  output: {schema: ExtractMedicationDetailsOutputSchema},
  prompt: `You are an AI assistant specializing in extracting medication details from prescription images. Analyze the following prescription image and extract the medication names, dosages, and frequencies. Provide a confidence level for the OCR extraction.

Prescription Image: {{media url=prescriptionDataUri}}

Output the information as a JSON object.`,
});

const extractMedicationDetailsFlow = ai.defineFlow(
  {
    name: 'extractMedicationDetailsFlow',
    inputSchema: ExtractMedicationDetailsInputSchema,
    outputSchema: ExtractMedicationDetailsOutputSchema,
  },
  async input => {
    const {output} = await extractMedicationDetailsPrompt(input);
    return output!;
  }
);
