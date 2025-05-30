
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {openAI} from '@genkit-ai/openai'; // Removed OpenAI plugin

export const ai = genkit({
  plugins: [
    googleAI({apiKey: 'AIzaSyCPQliLpua0SV3br50fN5zld5sYlTJo_f4'}),
    // openAI() // Removed OpenAI plugin instance
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for general use
});
