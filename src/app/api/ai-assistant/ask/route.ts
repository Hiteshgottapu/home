// src/app/api/ai-assistant/ask/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { askOpenAIAssistant, type AskAssistantInput } from '@/features/aiAssistant/ai/flows/ask-assistant-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is missing or invalid in the request body.' }, { status: 400 });
    }

    const input: AskAssistantInput = { question };
    const result = await askOpenAIAssistant(input);

    return NextResponse.json({ answer: result.answer });

  } catch (error: any) {
    console.error('Error in /api/ai-assistant/ask:', error);
    let errorMessage = 'AI request failed due to an unexpected error.';
    if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
