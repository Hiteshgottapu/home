
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-symptoms.ts';
// import '@/ai/flows/extract-medication-details.ts'; // This flow seems unused/redundant
import '@/ai/flows/get-medicine-info-flow.ts'; 
import '@/features/scriptRecognition/ai/flows/extract-script-details-flow.ts';
import '@/ai/flows/emergencyCheckFlow.ts';
import '@/ai/flows/generalChatFlow.ts';
