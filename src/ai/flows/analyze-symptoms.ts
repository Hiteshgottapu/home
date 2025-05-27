// 'use server'
'use server';

/**
 * @fileOverview An AI agent for analyzing symptoms and suggesting potential conditions.
 *
 * - analyzeSymptoms - A function that handles the symptom analysis process.
 * - AnalyzeSymptomsInput - The input type for the analyzeSymptoms function.
 * - AnalyzeSymptomsOutput - The return type for the analyzeSymptoms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSymptomsInputSchema = z.object({
  symptoms: z
    .string()
    .describe(
      'A comma-separated list of symptoms experienced by the user. Example: fever, cough, fatigue'
    ),
});
export type AnalyzeSymptomsInput = z.infer<typeof AnalyzeSymptomsInputSchema>;

const AnalyzeSymptomsOutputSchema = z.object({
  suggestedConditions: z.array(
    z.object({
      condition: z.string().describe('The name of the suggested condition.'),
      explanation: z
        .string()
        .describe(
          'An explanation of why the AI suggests this condition based on the symptoms provided.'
        ),
    })
  ).describe('A list of potential conditions suggested by the AI.'),
});
export type AnalyzeSymptomsOutput = z.infer<typeof AnalyzeSymptomsOutputSchema>;

export async function analyzeSymptoms(
  input: AnalyzeSymptomsInput
): Promise<AnalyzeSymptomsOutput> {
  return analyzeSymptomsFlow(input);
}

const analyzeSymptomsPrompt = ai.definePrompt({
  name: 'analyzeSymptomsPrompt',
  input: {schema: AnalyzeSymptomsInputSchema},
  output: {schema: AnalyzeSymptomsOutputSchema},
  prompt: `You are an AI-powered health assistant that analyzes symptoms provided by users and suggests potential medical conditions.

  Based on the following symptoms:
  {{symptoms}}

  Suggest a list of potential conditions, and for each condition, provide a brief explanation of why it is being suggested based on the symptoms provided. Adhere strictly to the output schema.
  `, // Ensure the prompt asks for an explanation for each condition
});

const analyzeSymptomsFlow = ai.defineFlow(
  {
    name: 'analyzeSymptomsFlow',
    inputSchema: AnalyzeSymptomsInputSchema,
    outputSchema: AnalyzeSymptomsOutputSchema,
  },
  async input => {
    const {output} = await analyzeSymptomsPrompt(input);
    return output!;
  }
);
