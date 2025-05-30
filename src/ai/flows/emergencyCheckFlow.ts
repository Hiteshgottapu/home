
'use server';
/**
 * @fileOverview Checks user input for emergency keywords.
 *
 * - emergencyCheckFlow - A function that analyzes user input for emergency indicators.
 * - EmergencyCheckInput - The input type for the emergencyCheckFlow function.
 * - EmergencyCheckOutput - The return type for the emergencyCheckFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EmergencyCheckInputSchema = z.object({
  userInput: z.string().describe('The text input from the user.'),
});
export type EmergencyCheckInput = z.infer<typeof EmergencyCheckInputSchema>;

const EmergencyCheckOutputSchema = z.object({
  isEmergency: z.boolean().describe('True if the input suggests an emergency, false otherwise.'),
  message: z.string().optional().describe('A message to display if it is an emergency.'),
});
export type EmergencyCheckOutput = z.infer<typeof EmergencyCheckOutputSchema>;

export async function emergencyCheckFlow(
  input: EmergencyCheckInput
): Promise<EmergencyCheckOutput> {
  return emergencyCheckGenkitFlow(input);
}

const emergencyKeywords = [
  "chest pain", "severe bleeding", "unconscious", "not breathing", "stroke symptoms",
  "difficulty breathing", "choking", "severe burn", "poisoning", "suicidal thoughts",
  "allergic reaction severe", "seizure", "loss of consciousness", "major trauma",
  "heart attack", "can't breathe"
];

// A more robust way would be to use a prompt, but for a quick check, keywords can be a first pass.
// This example uses a simple keyword check. For production, an LLM prompt is better.
const promptForEmergencyCheck = ai.definePrompt({
    name: 'emergencyCheckPrompt',
    input: { schema: EmergencyCheckInputSchema },
    output: { schema: EmergencyCheckOutputSchema },
    prompt: `Analyze the following user input to determine if it indicates a medical emergency.
User input: "{{userInput}}"

Consider keywords like: ${emergencyKeywords.join(", ")}.
Also consider phrases indicating severe distress, inability to perform vital functions, or immediate life-threatening conditions.

If an emergency is detected, set isEmergency to true and provide a concise message like "Your symptoms may require immediate medical attention. Please contact emergency services or go to the nearest emergency room."
If it's not an emergency, set isEmergency to false. Do not provide a message if not an emergency.
Your response MUST be in JSON format and strictly adhere to the output schema.
Example of emergency: "I have severe chest pain and I can't breathe" -> {"isEmergency": true, "message": "Your symptoms may require immediate medical attention..."}
Example of non-emergency: "I have a slight headache" -> {"isEmergency": false}
`,
});


const emergencyCheckGenkitFlow = ai.defineFlow(
  {
    name: 'emergencyCheckFlow',
    inputSchema: EmergencyCheckInputSchema,
    outputSchema: EmergencyCheckOutputSchema,
  },
  async (input) => {
    const { output } = await promptForEmergencyCheck(input);
    if (!output) {
        console.warn("Emergency check flow did not receive an output from the prompt.");
        return { isEmergency: false }; // Default to non-emergency if LLM fails
    }
    return output;
  }
);
