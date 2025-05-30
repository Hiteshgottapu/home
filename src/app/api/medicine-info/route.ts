'use server';
import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {getMedicineInfo, type GetMedicineInfoInput} from '@/ai/flows/get-medicine-info-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const medicineName = body.medicineName;

    if (!medicineName || typeof medicineName !== 'string') {
      return NextResponse.json({error: 'Medicine name is missing or invalid in the request body.'}, {status: 400});
    }

    const input: GetMedicineInfoInput = { medicineName };
    const result = await getMedicineInfo(input);

    // The flow itself handles the case where info might not be found and returns a default structure.
    // If the flow itself were to throw an unhandled error, the catch block below would handle it.
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in /api/medicine-info:', error);
    let errorMessage = 'Failed to fetch medicine information due to an unexpected error.';
    // Attempt to get a more specific message from the error object
    if (error.message) {
        errorMessage = error.message;
    }
    // Genkit sometimes puts details in cause or details, check for those
    if (error.cause && typeof error.cause === 'string') {
        errorMessage = `Underlying cause: ${error.cause}`;
    } else if (error.details && typeof error.details === 'string') {
        errorMessage = `Details: ${error.details}`;
    }
    return NextResponse.json({error: errorMessage}, {status: 500});
  }
}
