
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const googleApiKeyFromEnv = process.env.GOOGLE_API_KEY;

if (!googleApiKeyFromEnv || googleApiKeyFromEnv === "YOUR_GOOGLE_AI_STUDIO_API_KEY_HERE" || googleApiKeyFromEnv.includes("PASTE_YOUR") || googleApiKeyFromEnv.includes("XXXXX")) {
  console.warn(
    "GENKIT WARNING: The GOOGLE_API_KEY is missing, a placeholder, or invalid in your .env file.\n" +
    "Genkit AI features relying on Google AI models (like Gemini) may not function correctly or at all.\n" +
    "Please ensure GOOGLE_API_KEY is set to your actual Google AI Studio API Key in the .env file and RESTART your server.\n" +
    "You can get a key from: https://aistudio.google.com/app/apikey"
  );
  // Depending on strictness, you might choose to throw an error here or allow Genkit to initialize
  // and fail at runtime when a Google AI model is called. For now, just warning.
}

export const ai = genkit({
  plugins: [
    googleAI({apiKey: googleApiKeyFromEnv}), // Use the key from env
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for general use
});
