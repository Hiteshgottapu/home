
'use server';
/**
 * @fileOverview Provides general information about a given medicine using an AI model.
 *
 * - getMedicineInfo - A function that takes a medicine name and returns general information.
 * - GetMedicineInfoInput - The input type for the getMedicineInfo function.
 * - GetMedicineInfoOutput - The return type for the getMedicineInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DISCLAIMER_TEXT = "This information is for general knowledge and informational purposes only, and does not constitute medical advice. It is essential to consult with a qualified healthcare professional for any health concerns or before making any decisions related to your health or treatment. Do not disregard professional medical advice or delay in seeking it because of something you have read here.";

const GetMedicineInfoInputSchema = z.object({
  medicineName: z.string().describe('The name of the medicine to get information for.'),
});
export type GetMedicineInfoInput = z.infer<typeof GetMedicineInfoInputSchema>;

const GetMedicineInfoOutputSchema = z.object({
  overview: z.string().describe('A brief overview of the medicine.'),
  commonUses: z.array(z.string()).describe('A list of common uses or indications for the medicine.'),
  generalDosageInformation: z.string().describe('General dosage information, typically like that found in patient leaflets. This is not a specific prescription.'),
  commonPrecautions: z.array(z.string()).describe('A list of common precautions or warnings associated with the medicine.'),
  disclaimer: z.string().describe('A standard disclaimer about the information provided.').default(DISCLAIMER_TEXT),
});
export type GetMedicineInfoOutput = z.infer<typeof GetMedicineInfoOutputSchema>;

export async function getMedicineInfo(input: GetMedicineInfoInput): Promise<GetMedicineInfoOutput> {
  return getMedicineInfoFlow(input);
}

const getMedicineInfoPrompt = ai.definePrompt({
  name: 'getMedicineInfoPrompt',
  input: {schema: GetMedicineInfoInputSchema},
  output: {schema: GetMedicineInfoOutputSchema},
  prompt: `You are a helpful assistant providing general, publicly available information about medications.
For the medicine named "{{medicineName}}", please provide the following:
1.  A brief overview of the medicine.
2.  A list of its common uses or indications.
3.  Typical general dosage information (such as that found in patient leaflets, not a specific prescription for an individual).
4.  A list of common precautions or warnings associated with the medicine.

It is crucial to include the following disclaimer verbatim: "${DISCLAIMER_TEXT}"

Ensure your response strictly adheres to the output schema.
`,
});

const getMedicineInfoFlow = ai.defineFlow(
  {
    name: 'getMedicineInfoFlow',
    inputSchema: GetMedicineInfoInputSchema,
    outputSchema: GetMedicineInfoOutputSchema,
  },
  async (input) => {
    const {output} = await getMedicineInfoPrompt(input);
    
    if (output && !output.disclaimer) {
      // Ensure the disclaimer is always present, even if the model somehow misses it.
      return { ...output, disclaimer: DISCLAIMER_TEXT };
    }
    if (!output) {
        // Fallback or error handling if the prompt fails to produce output
        console.error(`Error generating medicine info for ${input.medicineName}: The AI model did not return structured output. This could be due to the medicine name being too obscure, or an issue with the model's response generation.`);
        return {
            overview: "Could not retrieve detailed information for this medicine at this time. The name might be too obscure or there might have been an issue processing it.",
            commonUses: [],
            generalDosageInformation: "N/A",
            commonPrecautions: [],
            disclaimer: DISCLAIMER_TEXT,
        };
    }
    return output;
  }
);

