
"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle, Pill, Info, ListChecks, ShieldAlert, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractMedicationDetails, ExtractMedicationDetailsOutput } from '@/ai/flows/extract-medication-details';
import { getMedicineInfo, GetMedicineInfoOutput } from '@/ai/flows/get-medicine-info-flow';
import type { Prescription, MedicationDetail, MedicineInfo } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const PrescriptionUploadSchema = z.object({
  prescriptionFile: z
    .custom<FileList>()
    .refine((files) => files && files.length === 1, "Please select a file.")
    .refine((files) => files && files[0]?.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
    .refine(
      (files) => files && ALLOWED_FILE_TYPES.includes(files[0]?.type),
      "Only .jpg, .png, and .pdf files are allowed."
    ),
});

type PrescriptionUploadFormValues = z.infer<typeof PrescriptionUploadSchema>;

interface ExtendedMedicationDetail extends MedicationDetail {
  isLoadingInfo?: boolean;
}

interface PrescriptionUploadFormProps {
  onUploadSuccess: (prescription: Prescription) => void;
}

export function PrescriptionUploadForm({ onUploadSuccess }: PrescriptionUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [isFetchingMedInfo, setIsFetchingMedInfo] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ExtractMedicationDetailsOutput | null>(null);
  const [detailedMedicationInfo, setDetailedMedicationInfo] = useState<ExtendedMedicationDetail[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<PrescriptionUploadFormValues>({
    resolver: zodResolver(PrescriptionUploadSchema),
  });

  const fileList = watch("prescriptionFile");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFileName(files[0].name);
      setAnalysisResult(null);
      setDetailedMedicationInfo([]);
    } else {
      setSelectedFileName(null);
    }
  };

  const onSubmit: SubmitHandler<PrescriptionUploadFormValues> = async (data) => {
    if (!firebaseUser || !db || !storage) {
      toast({ title: "Error", description: "User not authenticated or Firebase services not available.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setIsAnalyzingText(false);
    setIsFetchingMedInfo(false);
    setAnalysisResult(null);
    setDetailedMedicationInfo([]);
    const file = data.prescriptionFile[0];

    try {
      const storageFilePath = `users/${firebaseUser.uid}/prescriptions/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storageFilePath);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      setIsUploading(false);
      setIsAnalyzingText(true);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const textExtractionResult = await extractMedicationDetails({ prescriptionDataUri: base64data });
          setAnalysisResult(textExtractionResult);
          setIsAnalyzingText(false);

          let processedMedicationsForFirestore: MedicationDetail[] = textExtractionResult.medicationDetails || [];

          if (textExtractionResult.medicationDetails && textExtractionResult.medicationDetails.length > 0) {
            setIsFetchingMedInfo(true);
            // Initialize UI with loading state for all meds
            const initialMedsWithLoadingState: ExtendedMedicationDetail[] = textExtractionResult.medicationDetails.map(med => ({
              ...med,
              isLoadingInfo: true,
              info: undefined // Ensure info is initially undefined
            }));
            setDetailedMedicationInfo(initialMedsWithLoadingState);

            const medicationProcessingPromises = textExtractionResult.medicationDetails.map(async (med) => {
              try {
                const infoResult = await getMedicineInfo({ medicineName: med.name });
                return { ...med, info: infoResult, isLoadingInfo: false };
              } catch (infoError) {
                console.error(`Error fetching info for ${med.name}:`, infoError);
                toast({ title: "Info Fetch Error", description: `Could not fetch detailed information for ${med.name}.`, variant: "destructive", duration: 3000 });
                return { ...med, info: undefined, isLoadingInfo: false };
              }
            });

            const settledResults = await Promise.allSettled(medicationProcessingPromises);
            
            const finalMedicationDetails: ExtendedMedicationDetail[] = settledResults.map((result, index) => {
              if (result.status === 'fulfilled') {
                return result.value;
              } else {
                // Handle rejected promise (error during getMedicineInfo)
                // The original medication detail from textExtractionResult.medicationDetails[index] is used
                return {
                  ...(textExtractionResult.medicationDetails?.[index] || { name: 'Unknown', dosage: '', frequency: '' }), // Fallback
                  info: undefined,
                  isLoadingInfo: false
                };
              }
            });

            setDetailedMedicationInfo(finalMedicationDetails);
            processedMedicationsForFirestore = finalMedicationDetails.map(med => {
              const { isLoadingInfo, ...rest } = med; // Strip UI-only field
              return rest;
            });
            setIsFetchingMedInfo(false);
          }

          const prescriptionDoc: Omit<Prescription, 'id'> = {
            userId: firebaseUser.uid,
            fileName: file.name,
            uploadDate: new Date().toISOString(),
            status: 'needs_correction',
            extractedMedications: processedMedicationsForFirestore,
            ocrConfidence: textExtractionResult.ocrConfidence,
            userVerificationStatus: 'pending',
            imageUrl: imageUrl,
            storagePath: storageFilePath,
          };
          
          const prescriptionsColRef = collection(db, `users/${firebaseUser.uid}/prescriptions`);
          const docRef = await addDoc(prescriptionsColRef, prescriptionDoc);

          onUploadSuccess({ ...prescriptionDoc, id: docRef.id });
          toast({
            title: "Analysis Complete",
            description: "Prescription details extracted and analyzed. Please review and verify.",
          });
          reset(); 
          setSelectedFileName(null);
          // Keep analysisResult and detailedMedicationInfo for display until next upload

        } catch (aiError) {
          console.error("AI analysis error:", aiError);
          toast({ title: "AI Analysis Failed", description: "Could not analyze the prescription.", variant: "destructive" });
          setIsAnalyzingText(false);
          setIsFetchingMedInfo(false);
          // Optionally clear analysisResult and detailedMedicationInfo here if desired on AI error
          // setAnalysisResult(null);
          // setDetailedMedicationInfo([]);
        }
      };
      reader.onerror = () => {
        console.error("File reading error for AI analysis");
        toast({ title: "File Reading Error", description: "Could not read the file for AI analysis.", variant: "destructive" });
        setIsUploading(false);
        setIsAnalyzingText(false);
      };
    } catch (error) {
      console.error("Upload or Firestore error:", error);
      toast({ title: "Upload Failed", description: "An unexpected error occurred.", variant: "destructive" });
      setIsUploading(false);
      setIsAnalyzingText(false);
      setIsFetchingMedInfo(false);
    }
  };
  
  const currentLoadingStep = isUploading ? "Uploading image..." : isAnalyzingText ? "Extracting text..." : isFetchingMedInfo ? "Fetching medicine details..." : null;

  return (
    <Card id="upload" className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Upload Prescription</CardTitle>
        <CardDescription>Securely upload your prescription (JPEG, PNG, PDF - max 10MB). Our AI will analyze it for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prescriptionFile" className="sr-only">Prescription File</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="prescriptionFile" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg  bg-muted/50 hover:bg-muted/80 border-border hover:border-primary transition-colors ${currentLoadingStep ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">JPEG, PNG, PDF (MAX. 10MB)</p>
                        {selectedFileName && !currentLoadingStep && <p className="text-xs text-accent mt-2"><FileText className="inline h-3 w-3 mr-1" />{selectedFileName}</p>}
                    </div>
                    <Input 
                      id="prescriptionFile" 
                      type="file" 
                      className="hidden"
                      {...register("prescriptionFile", { onChange: handleFileChange })}
                      accept={ALLOWED_FILE_TYPES.join(",")} 
                      disabled={!!currentLoadingStep}
                    />
                </label>
            </div>
            {errors.prescriptionFile && <p className="text-sm text-destructive mt-1">{errors.prescriptionFile.message as string}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!!currentLoadingStep || !fileList || fileList.length === 0}>
            {currentLoadingStep ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {currentLoadingStep || 'Upload & Analyze'}
          </Button>
        </form>

        {(analysisResult || detailedMedicationInfo.length > 0) && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">AI Analysis Results (Review Below):</h3>
            {analysisResult && (
                <div className={`flex items-center p-3 rounded-md ${analysisResult.ocrConfidence > 0.7 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border mb-4`}>
                    {analysisResult.ocrConfidence > 0.7 ? <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-500 mr-2 shrink-0" />}
                    <p className="text-sm">
                    OCR Confidence for text extraction: <span className={`font-medium ${analysisResult.ocrConfidence > 0.7 ? 'text-green-700' : 'text-amber-700'}`}>{(analysisResult.ocrConfidence * 100).toFixed(1)}%</span>.
                    {analysisResult.ocrConfidence <= 0.7 && " Please verify extracted text carefully."}
                    </p>
                </div>
            )}

            {detailedMedicationInfo.length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-3">
                {detailedMedicationInfo.map((med, index) => (
                  <AccordionItem value={`med-${index}`} key={index} className="border rounded-md shadow-sm bg-card overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-2 text-base">
                        <Pill className="h-5 w-5 text-primary" /> 
                        <span className="font-medium">{med.name}</span>
                        {med.isLoadingInfo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4 space-y-3 bg-background/30">
                      <p className="text-sm"><span className="font-semibold text-muted-foreground">Dosage:</span> {med.dosage}</p>
                      <p className="text-sm"><span className="font-semibold text-muted-foreground">Frequency:</span> {med.frequency}</p>
                      {med.info && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><BookOpen size={14}/> Overview:</h4>
                            <p className="text-xs text-muted-foreground pl-1">{med.info.overview}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><ListChecks size={14}/> Common Uses:</h4>
                            <ul className="list-disc list-inside text-xs text-muted-foreground pl-2">
                              {med.info.commonUses.map((use, i) => <li key={i}>{use}</li>)}
                            </ul>
                          </div>
                           <div>
                            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Info size={14}/>General Dosage Info:</h4>
                            <p className="text-xs text-muted-foreground pl-1">{med.info.generalDosageInformation}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><ShieldAlert size={14}/> Common Precautions:</h4>
                            <ul className="list-disc list-inside text-xs text-muted-foreground pl-2">
                              {med.info.commonPrecautions.map((caution, i) => <li key={i}>{caution}</li>)}
                            </ul>
                          </div>
                          <div className="mt-2 p-2 border border-amber-500 bg-amber-50 rounded-md">
                            <p className="text-xs text-amber-700 font-medium">Disclaimer:</p>
                            <p className="text-xs text-amber-600">{med.info.disclaimer}</p>
                          </div>
                        </div>
                      )}
                       {!med.info && !med.isLoadingInfo && <p className="text-xs text-destructive">Could not load detailed information for this medicine.</p>}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              !isUploading && !isAnalyzingText && !isFetchingMedInfo && analysisResult && <p className="text-sm text-muted-foreground">No medication details extracted by AI, or details are still loading.</p>
            )}
            { detailedMedicationInfo.length > 0 && <p className="text-xs text-muted-foreground pt-2 text-center">Please verify these details. You can edit them from the main list view after verification.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    