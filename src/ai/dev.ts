
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-symptoms.ts';
import '@/ai/flows/extract-medication-details.ts';
import '@/ai/flows/get-medicine-info-flow.ts'; 
import '@/features/scriptRecognition/ai/flows/extract-script-details-flow.ts'; // Added new script recognition flow
