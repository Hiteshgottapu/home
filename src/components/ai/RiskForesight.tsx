"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';

export function RiskForesight() {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-accent"/> Personalized Risk Foresight
        </CardTitle>
        <CardDescription>
          Understand potential health risks based on your profile and data. This feature is under development.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Image 
            src="https://placehold.co/400x250.png?text=Risk+Analysis+Graph" 
            alt="Risk Analysis Placeholder" 
            width={400} 
            height={250} 
            className="mx-auto rounded-md my-6"
            data-ai-hint="risk graph analysis"
        />
        <p className="text-muted-foreground mb-2">
          Our AI is learning to provide you with personalized risk foresight.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Check back soon for insights tailored to your health journey. You can learn more about managing health risks from reputable sources.
        </p>
        <Button variant="link" asChild>
            <a href="https://www.who.int/health-topics" target="_blank" rel="noopener noreferrer" className="text-primary">
                Learn more at WHO.int <TrendingUp className="ml-1 h-4 w-4" />
            </a>
        </Button>
      </CardContent>
    </Card>
  );
}
