'use server';
/**
 * @fileOverview An AI assistant flow using OpenAI's GPT model directly via SDK.
 *
 * - askOpenAIAssistant - A function that takes a question and returns an answer from OpenAI.
 * - AskAssistantInput - The input type for the askOpenAIAssistant function.
 * - AskAssistantOutput - The return type for the askOpenAIAssistant function.
 */

import { ai } from '@/ai/genkit'; // Still use the main AI instance for defineFlow
import { z } from 'genkit';
import OpenAI from 'openai';

const AskAssistantInputSchema = z.object({
  question: z.string().describe('The question to ask the AI assistant.'),
});
export type AskAssistantInput = z.infer<typeof AskAssistantInputSchema>;

const AskAssistantOutputSchema = z.object({
  answer: z.string().describe('The AI assistant\'s answer.'),
});
export type AskAssistantOutput = z.infer<typeof AskAssistantOutputSchema>;

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askOpenAIAssistant(input: AskAssistantInput): Promise<AskAssistantOutput> {
  return askAssistantGenkitFlow(input);
}

const askAssistantGenkitFlow = ai.defineFlow(
  {
    name: 'askOpenAIAssistantFlow',
    inputSchema: AskAssistantInputSchema,
    outputSchema: AskAssistantOutputSchema,
  },
  async (input) => {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured.');
      return { answer: "I'm sorry, the AI Assistant is not configured correctly. Missing API key." };
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4', // Or your preferred OpenAI model
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input.question },
        ],
      });

      const answer = completion.choices[0]?.message?.content;

      if (!answer) {
        console.error('OpenAI assistant flow did not return expected content.');
        return { answer: "I'm sorry, I couldn't generate a response at this moment." };
      }

      return { answer };
    } catch (error: any) {
      console.error('Error calling OpenAI API:', error.message);
      // You might want to inspect error.response.data for more details from OpenAI
      return { answer: `I'm sorry, I encountered an error: ${error.message}` };
    }
  }
);
