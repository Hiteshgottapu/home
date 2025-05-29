
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-symptoms.ts';
import '@/ai/flows/extract-medication-details.ts';
import '@/ai/flows/get-medicine-info-flow.ts'; // Added new flow
