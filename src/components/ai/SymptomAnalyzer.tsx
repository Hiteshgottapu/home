"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, Lightbulb, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeSymptoms, AnalyzeSymptomsOutput, AnalyzeSymptomsInput } from '@/ai/flows/analyze-symptoms';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext'; // For AI preferences

const SymptomAnalysisSchema = z.object({
  symptoms: z.string().min(10, "Please describe your symptoms in more detail (at least 10 characters).").max(500, "Symptoms input cannot exceed 500 characters."),
});

type SymptomAnalysisFormValues = z.infer<typeof SymptomAnalysisSchema>;

interface Feedback {
  condition: string;
  rating: 'accurate' | 'inaccurate' | null;
  comment: string;
}

export function SymptomAnalyzer() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSymptomsOutput | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SymptomAnalysisFormValues>({
    resolver: zodResolver(SymptomAnalysisSchema),
  });

  const onSubmit: SubmitHandler<SymptomAnalysisFormValues> = async (data) => {
    setIsLoading(true);
    setAnalysisResult(null);
    setFeedbacks({}); // Reset feedback on new analysis

    try {
      // Include AI preference if available from user profile (conceptual)
      const inputData: AnalyzeSymptomsInput = { symptoms: data.symptoms };
      // if (user?.aiFeedbackPreferences.symptomExplainabilityLevel) {
      //   inputData.explainabilityLevel = user.aiFeedbackPreferences.symptomExplainabilityLevel;
      // }
      
      const result = await analyzeSymptoms(inputData);
      setAnalysisResult(result);
      toast({
        title: "Symptom Analysis Complete",
        description: "Potential conditions based on your symptoms are listed below.",
      });
    } catch (error) {
      console.error("Symptom analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze symptoms. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (conditionName: string, rating: 'accurate' | 'inaccurate') => {
    setFeedbacks(prev => ({
      ...prev,
      [conditionName]: { ...prev[conditionName], condition: conditionName, rating }
    }));
    // Here you would call `recordUserFeedbackAI` Cloud Function
    toast({ title: "Feedback Received", description: `Thank you for your feedback on ${conditionName}!`});
  };

  const handleFeedbackComment = (conditionName: string, comment: string) => {
     setFeedbacks(prev => ({
      ...prev,
      [conditionName]: { ...prev[conditionName], condition: conditionName, comment }
    }));
  };
  
  // Conceptual: Function to submit all feedback for a condition
  const submitConditionFeedback = (conditionName: string) => {
    const feedback = feedbacks[conditionName];
    if (feedback) {
      console.log("Submitting feedback for:", conditionName, feedback);
      // Call to backend: recordUserFeedbackAI({ sourceId: 'symptomCheck_XYZ', feedbackData: feedback })
      toast({ title: "Comment Submitted", description: `Your comment for ${conditionName} has been noted.`});
    }
  };


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary"/> AI Symptom Analyzer
        </CardTitle>
        <CardDescription>
          Describe your symptoms, and our AI will provide potential insights. This is not a medical diagnosis. Always consult a healthcare professional for medical advice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="symptoms">Describe your symptoms</Label>
            <Textarea
              id="symptoms"
              placeholder="e.g., persistent cough, mild fever, headache for 3 days"
              rows={4}
              {...register("symptoms")}
              className={errors.symptoms ? "border-destructive" : ""}
            />
            {errors.symptoms && <p className="text-sm text-destructive">{errors.symptoms.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            Analyze Symptoms
          </Button>
        </form>

        {analysisResult && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Potential Conditions:</h3>
            {analysisResult.suggestedConditions.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {analysisResult.suggestedConditions.map((item, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="text-base font-medium hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-accent" />
                        {item.condition}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 pb-4 px-1">
                      <p className="text-sm text-muted-foreground">{item.explanation}</p>
                      
                      {/* User Feedback Section */}
                      <div className="mt-3 p-3 border-t border-border bg-muted/30 rounded-b-md">
                        <p className="text-xs font-medium mb-2 text-foreground">Was this suggestion accurate?</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Button 
                            variant={feedbacks[item.condition]?.rating === 'accurate' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => handleFeedback(item.condition, 'accurate')}
                            className="text-xs"
                          >
                            <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Accurate
                          </Button>
                          <Button 
                            variant={feedbacks[item.condition]?.rating === 'inaccurate' ? 'destructive' : 'outline'} 
                            size="sm" 
                            onClick={() => handleFeedback(item.condition, 'inaccurate')}
                            className="text-xs"
                           >
                            <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> Inaccurate
                          </Button>
                        </div>
                        {feedbacks[item.condition]?.rating && (
                          <div className="space-y-1">
                            <Label htmlFor={`comment-${index}`} className="text-xs">Optional Comment:</Label>
                            <Textarea 
                              id={`comment-${index}`}
                              rows={2}
                              placeholder="e.g., I also have symptom Z, or this was very helpful."
                              value={feedbacks[item.condition]?.comment || ''}
                              onChange={(e) => handleFeedbackComment(item.condition, e.target.value)}
                              className="text-xs"
                            />
                            <Button size="xs" variant="link" className="text-primary p-0 h-auto" onClick={() => submitConditionFeedback(item.condition)}>Submit Comment</Button>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No specific conditions suggested based on the input. Try providing more details or rephrasing.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
