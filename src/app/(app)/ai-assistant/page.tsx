"use client";

import { SymptomAnalyzer } from '@/components/ai/SymptomAnalyzer';
import { RiskForesight } from '@/components/ai/RiskForesight';

export default function AiAssistantPage() {
  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">VitaLog AI Advisor</h1>
        <p className="text-muted-foreground">Your intelligent partner for symptom analysis and risk insights.</p>
      </div>
      
      <div className="grid lg:grid-cols-1 gap-8 items-start"> {/* Changed to single column for better focus on each tool */}
        <SymptomAnalyzer />
        <RiskForesight />
      </div>
    </div>
  );
}
