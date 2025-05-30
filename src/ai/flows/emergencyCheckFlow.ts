
'use server';
/**
 * @fileOverview Checks user input for emergency keywords and phrases to determine if immediate medical attention is advised.
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
  message: z.string().optional().describe('A direct and urgent message to display if it is an emergency.'),
});
export type EmergencyCheckOutput = z.infer<typeof EmergencyCheckOutputSchema>;

export async function emergencyCheckFlow(
  input: EmergencyCheckInput
): Promise<EmergencyCheckOutput> {
  return emergencyCheckGenkitFlow(input);
}

// Expanded list of keywords and phrases.
// This list should be regularly reviewed and updated.
const emergencyKeywordsAndPhrases = [
  "chest pain", "severe chest pain", "crushing chest pain", "heart attack symptoms",
  "severe bleeding", "uncontrolled bleeding", "bleeding profusely",
  "unconscious", "not responsive", "passed out", "collapsed",
  "not breathing", "stopped breathing", "can't breathe", "gasping for air",
  "stroke symptoms", "facial droop", "arm weakness", "speech difficulty", "sudden confusion", "loss of balance",
  "difficulty breathing", "shortness of breath severe", "struggling to breathe",
  "choking", "can't speak or cough",
  "severe burn", "large burn", "deep burn",
  "poisoning", "ingested poison", "overdose",
  "suicidal thoughts", "want to end my life", "thinking of killing myself",
  "allergic reaction severe", "anaphylaxis", "throat swelling", "difficulty swallowing with rash",
  "seizure", "convulsion", "fitting",
  "loss of consciousness",
  "major trauma", "severe accident", "bad injury", "head injury severe",
  "sudden severe headache", "worst headache of my life",
  "sudden vision loss",
  "high fever with stiff neck", "fever with confusion",
  "blue lips", "blue face", "cyanosis",
  "persistent vomiting blood", "coughing up blood significant",
  "abdominal pain unbearable", "rigid abdomen"
];

const promptForEmergencyCheck = ai.definePrompt({
    name: 'emergencyCheckPrompt',
    input: { schema: EmergencyCheckInputSchema },
    output: { schema: EmergencyCheckOutputSchema },
    prompt: `You are an AI system designed to detect medical emergencies from user input.
Your ONLY task is to determine if the user's statement indicates a potential medical emergency that requires immediate attention.
Analyze the following user input:
User input: "{{userInput}}"

Consider the following keywords and phrases which often indicate an emergency: ${emergencyKeywordsAndPhrases.join(", ")}.
Also, critically evaluate the overall sentiment, severity, and urgency implied by the user's language.
Look for descriptions of:
- Sudden, severe, or unbearable pain, especially in the chest, head, or abdomen.
- Difficulty with vital functions: breathing, consciousness, speech.
- Signs of major trauma or bleeding.
- Symptoms strongly indicative of life-threatening conditions like heart attack, stroke, anaphylaxis, or seizure.
- Expressions of suicidal intent.

If an emergency is detected:
- Set isEmergency to true.
- Provide a **direct and urgent message** like: "Your symptoms sound serious and may require immediate medical attention. Please contact emergency services (e.g., 911, 112) or go to the nearest emergency room right away." OR "Based on what you've described, this could be an emergency. It's very important to get medical help immediately. Please call emergency services or go to the nearest emergency department."

If it is clearly NOT an emergency (e.g., mild cold symptoms, asking for general information):
- Set isEmergency to false.
- Do NOT provide a message.

If unsure, err on the side of caution and treat it as a potential emergency if there are any strong indicators.
Your response MUST be in JSON format and strictly adhere to the output schema.

Example of emergency: "I have crushing chest pain and my left arm is numb" -> {"isEmergency": true, "message": "Your symptoms sound serious and may require immediate medical attention. Please contact emergency services (e.g., 911, 112) or go to the nearest emergency room right away."}
Example of non-emergency: "I have a slight headache and a runny nose" -> {"isEmergency": false}
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
        // This case should ideally not happen if the prompt is robust.
        // If it does, it might mean the LLM failed to produce valid JSON matching the schema,
        // or a safety filter was triggered by the input.
        console.warn("Emergency check flow did not receive a structured output from the prompt. This is unexpected. User input:", input.userInput);
        // Default to non-emergency if LLM fails to give a structured response, but log this occurrence.
        // A more robust system might have a secondary check or human escalation path for unparseable critical inputs.
        return { isEmergency: false };
    }
    return output;
  }
);

    