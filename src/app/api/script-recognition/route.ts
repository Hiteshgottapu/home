
import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {extractScriptDetails, type ExtractScriptDetailsInput} from '@/features/scriptRecognition/ai/flows/extract-script-details-flow';

export async function POST(request: NextRequest) {
  try {
    // The UI component sends a JSON body with an "image" field containing the base64 data URI
    const body = await request.json();
    const imageBase64Uri = body.image;

    if (!imageBase64Uri || typeof imageBase64Uri !== 'string') {
      return NextResponse.json({error: 'Image data URI is missing or invalid in the request body.'}, {status: 400});
    }

    const input: ExtractScriptDetailsInput = {scriptImageUri: imageBase64Uri};
    const result = await extractScriptDetails(input);

    return NextResponse.json(result); // The flow output is already the desired JSON structure

  } catch (error: any) {
    console.error('Error in /api/script-recognition:', error);
    let errorMessage = 'Extraction failed due to an unexpected error.';
    if (error.message) {
        errorMessage = error.message;
    }
    // Check if it's a Genkit-specific error or has more details
    if (error.cause && typeof error.cause === 'string') {
        errorMessage = error.cause;
    } else if (error.details) {
        errorMessage = error.details;
    }
    return NextResponse.json({error: errorMessage}, {status: 500});
  }
}
