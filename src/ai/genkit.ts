
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiKey: 'AIzaSyBZGfP4rwV-uX1Dh11TdxxoRTycfb3qaH4'})],
  model: 'googleai/gemini-2.0-flash',
});

