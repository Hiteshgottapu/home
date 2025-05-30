
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-symptoms.ts';
import '@/ai/flows/extract-medication-details.ts';
import '@/ai/flows/get-medicine-info-flow.ts'; 
import '@/features/scriptRecognition/ai/flows/extract-script-details-flow.ts';
import '@/ai/flows/emergencyCheckFlow.ts'; // Added new Health Assistant flow
import '@/ai/flows/generalChatFlow.ts'; // Added new Health Assistant flow
