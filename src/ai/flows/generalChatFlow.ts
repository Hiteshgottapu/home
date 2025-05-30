
'use server';
/**
 * @fileOverview Provides a general conversational response.
 *
 * - generalChatFlow - A function that takes user input and returns a chat response.
 * - GeneralChatInput - The input type for the generalChatFlow function.
 * - GeneralChatOutput - The return type for the generalChatFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessagePartSchema = z.object({
  text: z.string(),
  // You can add other parts like 'image' if your chat supports multimodal input
});

const ChatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(MessagePartSchema),
});


const GeneralChatInputSchema = z.object({
  userQuery: z.string().describe('The latest query from the user.'),
  history: z.array(ChatHistoryMessageSchema).optional().describe('The conversation history.'),
});
export type GeneralChatInput = z.infer<typeof GeneralChatInputSchema>;

const GeneralChatOutputSchema = z.object({
  responseText: z.string().describe('The AI-generated chat response.'),
});
export type GeneralChatOutput = z.infer<typeof GeneralChatOutputSchema>;

export async function generalChatFlow(
  input: GeneralChatInput
): Promise<GeneralChatOutput> {
  return generalChatGenkitFlow(input);
}

const generalChatPrompt = ai.definePrompt({
  name: 'generalChatPrompt',
  input: { schema: GeneralChatInputSchema },
  output: { schema: GeneralChatOutputSchema },
  prompt: `You are a friendly and helpful AI Health Assistant for an app called VitaLog Pro.
Your primary goal is to provide supportive and informative responses regarding general health queries.
You are NOT a doctor and CANNOT give medical advice, diagnoses, or treatment plans.
Always include a disclaimer if providing health-related information: "Remember, I'm an AI assistant and this information is not a substitute for professional medical advice. Please consult a healthcare provider for any health concerns."

Conversation History:
{{#if history}}
  {{#each history}}
    {{role}}: {{parts.0.text}}
  {{/each}}
{{else}}
  No history yet.
{{/if}}

User's latest query: {{userQuery}}

Based on the conversation history and the user's latest query, provide a helpful and empathetic response.
If the query is outside of health topics, politely state that you are focused on health assistance.
If the user asks for a diagnosis or specific medical advice, gently decline and recommend consulting a doctor.
Adhere strictly to the output schema.
`,
});

const generalChatGenkitFlow = ai.defineFlow(
  {
    name: 'generalChatFlow',
    inputSchema: GeneralChatInputSchema,
    outputSchema: GeneralChatOutputSchema,
  },
  async (input) => {
    const { output } = await generalChatPrompt(input);
    if (!output) {
        return { responseText: "I'm sorry, I couldn't generate a response right now. Please try again."};
    }
    return output;
  }
);
