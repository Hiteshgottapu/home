
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-symptoms.ts';
import '@/ai/flows/extract-medication-details.ts';
import '@/ai/flows/get-medicine-info-flow.ts'; 
import '@/features/scriptRecognition/ai/flows/extract-script-details-flow.ts';
import '@/ai/flows/emergencyCheckFlow.ts';
import '@/ai/flows/generalChatFlow.ts';
import '@/features/aiAssistant/ai/flows/ask-assistant-flow.ts'; // Added new OpenAI Assistant flow
