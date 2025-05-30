
'use server';
/**
 * @fileOverview Extracts structured details from a script/prescription image using Genkit and Gemini.
 *
 * - extractScriptDetails - A function that takes an image (as a data URI) and returns extracted details.
 * - ExtractScriptDetailsInput - The input type for the extractScriptDetails function.
 * - ExtractScriptDetailsOutput - The return type for the extractScriptDetails function.
 */

import {ai} from '@/ai/genkit'; // Use the existing ai instance
import {z} from 'genkit';

const MedicationSchema = z.object({
  name: z.string().describe('The name of the medication.'),
  dosage: z.string().optional().describe('The dosage of the medication (e.g., "10mg", "1 tablet").'),
  frequency: z.string().optional().describe('The frequency of administration (e.g., "once daily", "2 times a day").'),
  notes: z.string().optional().describe('Any other relevant notes for this specific medication (e.g., "after food", "for 7 days").')
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
    .describe('A list of extracted medication details.'),
  overallConfidence: z
    .number()
    .optional()
    .describe(
      'An overall confidence level (0-1) for the entire extraction, if the model can provide it.'
    ),
  unclearSections: z.array(z.string()).optional().describe("List of any sections or terms that were difficult to decipher."),
});
export type ExtractScriptDetailsOutput = z.infer<typeof ExtractScriptDetailsOutputSchema>;

export async function extractScriptDetails(
  input: ExtractScriptDetailsInput
): Promise<ExtractScriptDetailsOutput> {
  return extractScriptDetailsFlow(input);
}

const extractScriptDetailsPrompt = ai.definePrompt({
  name: 'extractScriptDetailsPrompt',
  input: {schema: ExtractScriptDetailsInputSchema},
  output: {schema: ExtractScriptDetailsOutputSchema},
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
5.  If possible, provide an overall confidence score (0 to 1) for the accuracy of the entire extraction.
6.  List any specific words, names, or sections that were particularly unclear or illegible.

Focus on accuracy and structure. If a piece of information (like patient name or a specific dosage) is not clearly visible or legible, omit it or explicitly state it's unclear in the 'unclearSections' field rather than guessing.
Ensure your output strictly adheres to the JSON schema provided for the output.
`,
});

const extractScriptDetailsFlow = ai.defineFlow(
  {
    name: 'extractScriptDetailsFlow',
    inputSchema: ExtractScriptDetailsInputSchema,
    outputSchema: ExtractScriptDetailsOutputSchema,
  },
  async (input) => {
    const {output} = await extractScriptDetailsPrompt(input);
    if (!output) {
      // Handle cases where the prompt might fail or return nothing
      // This could be due to safety settings or other model issues.
      console.error('extractScriptDetailsFlow: Prompt did not return an output.');
      // Consider returning a default error structure or throwing
      return {
        medications: [],
        unclearSections: ["The AI model did not return any data. This could be due to image quality or content policy."]
      };
    }
    return output;
  }
);
