
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiKey: 'AIzaSyCPQliLpua0SV3br50fN5zld5sYlTJo_f4'})],
  model: 'googleai/gemini-2.0-flash',
});

