// src/app/(app)/openai-chat/page.tsx
import { AIAssistant } from '@/features/aiAssistant/components/AIAssistant';

export default function OpenAIChatPage() {
  return (
    <div className="container mx-auto py-8 px-4 flex justify-center">
      <AIAssistant />
    </div>
  );
}
