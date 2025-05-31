
"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, ListChecks, Info, AlertTriangle, ShieldCheck, Leaf, Pill } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeSymptoms, AnalyzeSymptomsOutput, AnalyzeSymptomsInput } from '@/ai/flows/analyze-symptoms';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const SymptomAnalysisSchema = z.object({
  symptoms: z.string().min(10, "Please describe your symptoms in more detail (at least 10 characters).").max(500, "Symptoms input cannot exceed 500 characters."),
});

type SymptomAnalysisFormValues = z.infer<typeof SymptomAnalysisSchema>;

export function SymptomAnalyzer() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSymptomsOutput | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SymptomAnalysisFormValues>({
    resolver: zodResolver(SymptomAnalysisSchema),
  });

  const onSubmit: SubmitHandler<SymptomAnalysisFormValues> = async (data) => {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const inputData: AnalyzeSymptomsInput = { symptoms: data.symptoms };
      const result = await analyzeSymptoms(inputData);
      setAnalysisResult(result);
      toast({
        title: "Symptom Analysis Complete",
        description: "Your HealthFlow Insights are ready below.",
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
  
  const placeholderRedFlags = [
      "Severe chest pain",
      "Shortness of breath",
      "Sudden, severe headache",
      "Unexplained weight loss",
      "High fever",
      "Confusion or disorientation",
      "Vision changes",
      "Fainting or loss of consciousness"
  ];

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
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-semibold text-primary flex items-center gap-2">
              <ListChecks className="h-7 w-7" />
              Your HealthFlow Insights
            </h2>

            {/* Understanding Your Symptoms */}
            <Accordion type="single" collapsible defaultValue="item-understanding" className="w-full">
              <AccordionItem value="item-understanding">
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Understanding Your Symptoms
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2 pb-4 px-1 text-muted-foreground">
                  {analysisResult.symptomSummary?.generalExplanation ? (
                    <p>{analysisResult.symptomSummary.generalExplanation}</p>
                  ) : analysisResult.suggestedConditions && analysisResult.suggestedConditions.length > 0 ? (
                    <p>{analysisResult.suggestedConditions[0].explanation}</p>
                  ) : (
                    <p>General information about your symptoms will appear here.</p>
                  )}
                  {analysisResult.symptomSummary?.possibleCauses && analysisResult.symptomSummary.possibleCauses.length > 0 && (
                    <div className="pt-2">
                      <h4 className="font-semibold text-sm text-foreground">Possible Causes May Include:</h4>
                      <ul className="list-disc list-inside pl-2 mt-1 text-sm">
                        {analysisResult.symptomSummary.possibleCauses.map((cause, idx) => (
                          <li key={idx}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Potential Red Flags */}
             <Card className="border-amber-500/50 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5"/> Important: Potential Red Flags
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                    <p className="mb-2">Seek immediate medical attention if you experience your symptoms along with any of the following red flag symptoms:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        {(analysisResult.potentialRedFlags && analysisResult.potentialRedFlags.length > 0 
                          ? analysisResult.potentialRedFlags 
                          : placeholderRedFlags
                        ).map((flag, index) => (
                            <li key={index}>{flag}</li>
                        ))}
                    </ul>
                     {(!analysisResult.potentialRedFlags || analysisResult.potentialRedFlags.length === 0) && (
                        <p className="mt-2 text-xs italic">Note: This is a general list. AI-specific red flags based on your symptoms will appear here when generated.</p>
                    )}
                </CardContent>
            </Card>

            {/* Other Accordions */}
            <Accordion type="multiple" className="w-full space-y-3">
              <AccordionItem value="item-precautions">
                <AccordionTrigger className="text-base font-medium hover:no-underline [&[data-state=closed]>div>svg.lucide-chevron-down]:text-green-600 [&[data-state=open]>div>svg.lucide-chevron-down]:text-green-700">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Helpful Precautions & Self-Care
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2 pb-4 px-1 text-muted-foreground">
                  {analysisResult.helpfulPrecautions && analysisResult.helpfulPrecautions.length > 0 ? (
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        {analysisResult.helpfulPrecautions.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : (
                    <p>General precautions and self-care tips will appear here.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-remedies">
                <AccordionTrigger className="text-base font-medium hover:no-underline [&[data-state=closed]>div>svg.lucide-chevron-down]:text-teal-600 [&[data-state=open]>div>svg.lucide-chevron-down]:text-teal-700">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-teal-600" />
                    Suggested Home Remedies
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2 pb-4 px-1 text-muted-foreground">
                   {analysisResult.suggestedHomeRemedies && analysisResult.suggestedHomeRemedies.length > 0 ? (
                     <ul className="list-disc list-inside pl-2 space-y-1">
                        {analysisResult.suggestedHomeRemedies.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : (
                    <p>Suggestions for home remedies will appear here.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-otc">
                <AccordionTrigger className="text-base font-medium hover:no-underline [&[data-state=closed]>div>svg.lucide-chevron-down]:text-indigo-600 [&[data-state=open]>div>svg.lucide-chevron-down]:text-indigo-700">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-indigo-600" />
                    Over-the-Counter Medication Ideas
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2 pb-4 px-1 text-muted-foreground">
                  {analysisResult.otcMedicationIdeas && analysisResult.otcMedicationIdeas.length > 0 ? (
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        {analysisResult.otcMedicationIdeas.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : (
                     <p>Ideas for over-the-counter medications will appear here.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Fallback for Suggested Conditions if no summary */}
            {(!analysisResult.symptomSummary || !analysisResult.symptomSummary.generalExplanation) && analysisResult.suggestedConditions && analysisResult.suggestedConditions.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Further Potential Conditions:</h3>
                    <Accordion type="single" collapsible className="w-full">
                        {analysisResult.suggestedConditions.map((item, index) => (
                        <AccordionItem value={`item-condition-${index}`} key={index}>
                            <AccordionTrigger className="text-base font-medium hover:no-underline">
                            <div className="flex items-center gap-2">
                                {item.condition}
                            </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2 pb-4 px-1">
                            <p className="text-sm text-muted-foreground">{item.explanation}</p>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            )}
            
            <Alert variant="default" className="mt-8 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-700 dark:text-blue-300">Important Disclaimer</AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-300/90">
                The information provided by the AI Symptom Analyzer is for general informational purposes only, and does not constitute medical advice. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </AlertDescription>
            </Alert>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
