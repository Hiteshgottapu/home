
"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractMedicationDetails, ExtractMedicationDetailsOutput } from '@/ai/flows/extract-medication-details';
import type { Prescription } from '@/types';
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

interface PrescriptionUploadFormProps {
  onUploadSuccess: (prescription: Prescription) => void;
}

export function PrescriptionUploadForm({ onUploadSuccess }: PrescriptionUploadFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ExtractMedicationDetailsOutput | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null); // Renamed for clarity
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
    } else {
      setSelectedFileName(null);
    }
  };

  const onSubmit: SubmitHandler<PrescriptionUploadFormValues> = async (data) => {
    if (!firebaseUser || !db || !storage) {
      toast({ title: "Error", description: "User not authenticated or Firebase services not available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setAnalysisResult(null);
    const file = data.prescriptionFile[0];

    try {
      // 1. Upload file to Firebase Storage
      const storageFilePath = `users/${firebaseUser.uid}/prescriptions/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storageFilePath);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Get Base64 data for AI analysis
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          // 3. Call AI Flow
          const aiResult = await extractMedicationDetails({ prescriptionDataUri: base64data });
          setAnalysisResult(aiResult);

          // 4. Save metadata to Firestore
          const prescriptionDoc: Omit<Prescription, 'id'> = {
            userId: firebaseUser.uid,
            fileName: file.name,
            uploadDate: new Date().toISOString(),
            status: 'needs_correction', // Default status after AI analysis
            extractedMedications: aiResult.medicationDetails,
            ocrConfidence: aiResult.ocrConfidence,
            userVerificationStatus: 'pending',
            imageUrl: imageUrl, // URL from Firebase Storage
            storagePath: storageFilePath, // Path for potential deletion
            // patientName and doctor can be added later or through another form
          };
          
          const prescriptionsColRef = collection(db, `users/${firebaseUser.uid}/prescriptions`);
          const docRef = await addDoc(prescriptionsColRef, prescriptionDoc);

          onUploadSuccess({ ...prescriptionDoc, id: docRef.id });
          toast({
            title: "Analysis Complete",
            description: "Prescription details extracted. Please review and verify.",
          });
          reset(); // Reset the form
          setSelectedFileName(null);

        } catch (aiError) {
          console.error("AI analysis error:", aiError);
          toast({ title: "AI Analysis Failed", description: "Could not analyze the prescription.", variant: "destructive" });
        } finally {
          setIsLoading(false); // Moved here to ensure it's called even if AI fails
        }
      };
      reader.onerror = () => {
        console.error("File reading error for AI analysis");
        toast({ title: "File Reading Error", description: "Could not read the file for AI analysis.", variant: "destructive" });
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Upload or Firestore error:", error);
      toast({ title: "Upload Failed", description: "An unexpected error occurred.", variant: "destructive" });
      setIsLoading(false);
    }
  };

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
                <label htmlFor="prescriptionFile" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 border-border hover:border-primary transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">JPEG, PNG, PDF (MAX. 10MB)</p>
                        {selectedFileName && <p className="text-xs text-accent mt-2"><FileText className="inline h-3 w-3 mr-1" />{selectedFileName}</p>}
                    </div>
                    <Input 
                      id="prescriptionFile" 
                      type="file" 
                      className="hidden"
                      {...register("prescriptionFile", { onChange: handleFileChange })}
                      accept={ALLOWED_FILE_TYPES.join(",")} 
                    />
                </label>
            </div>
            {errors.prescriptionFile && <p className="text-sm text-destructive mt-1">{errors.prescriptionFile.message as string}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isLoading ? 'Processing...' : 'Upload & Analyze'}
          </Button>
        </form>

        {analysisResult && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">AI Analysis Results (Review Below):</h3>
            <Card className="bg-background/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center">
                  {analysisResult.ocrConfidence > 0.7 ? <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> : <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />}
                  <p className="text-sm">OCR Confidence: <span className={`font-medium ${analysisResult.ocrConfidence > 0.7 ? 'text-green-600' : 'text-amber-600'}`}>{(analysisResult.ocrConfidence * 100).toFixed(1)}%</span></p>
                </div>
                {analysisResult.ocrConfidence <= 0.7 && <p className="text-xs text-amber-700">Low confidence: please verify details carefully in the list below.</p>}
                
                {analysisResult.medicationDetails.length > 0 ? (
                  <ul className="space-y-2">
                    {analysisResult.medicationDetails.map((med, index) => (
                      <li key={index} className="p-3 border rounded-md bg-card shadow-sm">
                        <p className="font-medium text-primary">{med.name}</p>
                        <p className="text-sm text-muted-foreground">Dosage: {med.dosage}</p>
                        <p className="text-sm text-muted-foreground">Frequency: {med.frequency}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No medication details extracted by AI. Please add manually if needed after upload.</p>
                )}
                 <p className="text-xs text-muted-foreground pt-2">Please verify these details against your prescription. You can edit them from the main list view.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    