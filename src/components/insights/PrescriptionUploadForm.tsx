
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, FileText, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { Prescription, MedicationDetail } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png']; // Recommended for direct image analysis by Gemini in CF

// Zod schema is minimal as we handle file validation mostly in handleFileChange
const PrescriptionUploadSchema = z.object({
  // prescriptionFile: z.custom<FileList>().optional(), // We handle file via state
});

type PrescriptionUploadFormValues = z.infer<typeof PrescriptionUploadSchema>;

interface PrescriptionUploadFormProps {
  onUploadSuccess: (prescription: Prescription) => void;
}

const CLOUD_FUNCTION_URL = 'YOUR_CLOUD_FUNCTION_URL_HERE'; // CRITICAL: Replace with your deployed function URL

export function PrescriptionUploadForm({ onUploadSuccess }: PrescriptionUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [isUploadingToStorage, setIsUploadingToStorage] = useState(false);
  const [isAnalyzingWithCloudFunction, setIsAnalyzingWithCloudFunction] = useState(false);
  const [extractedMedicineNames, setExtractedMedicineNames] = useState<string[]>([]); // Simpler state for Python CF output

  const { toast } = useToast();
  const { firebaseUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form handling with react-hook-form, though we don't register the file input directly
  const { handleSubmit, reset, formState: { errors }, clearErrors } = useForm<PrescriptionUploadFormValues>({
    resolver: zodResolver(PrescriptionUploadSchema),
  });

  useEffect(() => {
    const currentPreviewUrl = imagePreviewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
        console.log("PrescriptionUploadForm: Revoked object URL for preview.");
      }
    };
  }, [imagePreviewUrl]);

  const resetFormState = (fullReset = true) => {
    console.log("PrescriptionUploadForm: Resetting form state. Full reset:", fullReset);
    if (fullReset && fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the actual file input
    }
    setSelectedFile(null);
    setSelectedFileName(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setExtractedMedicineNames([]);
    setIsUploadingToStorage(false);
    setIsAnalyzingWithCloudFunction(false);
    reset(); // Resets react-hook-form errors/state
    clearErrors();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("PrescriptionUploadForm handleFileChange: Event triggered.");
    resetFormState(false); // Partial reset: keep file input if user selects another invalid one

    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a JPG or PNG image.", variant: "destructive" });
        resetFormState(); // Full reset
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File Too Large", description: "Maximum file size is 10MB.", variant: "destructive" });
        resetFormState(); // Full reset
        return;
      }

      setSelectedFile(file);
      setSelectedFileName(file.name);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(URL.createObjectURL(file));
      console.log("PrescriptionUploadForm handleFileChange: File selected -", file.name);
    } else {
      console.log("PrescriptionUploadForm handleFileChange: No file selected.");
      resetFormState(); // Full reset
    }
  };

  const onSubmit: SubmitHandler<PrescriptionUploadFormValues> = async () => {
    console.log("PrescriptionUploadForm onSubmit: Form submitted.");

    if (CLOUD_FUNCTION_URL === 'YOUR_CLOUD_FUNCTION_URL_HERE' || !CLOUD_FUNCTION_URL) {
      console.error("CRITICAL: CLOUD_FUNCTION_URL is not configured in PrescriptionUploadForm.tsx");
      toast({
        title: "Configuration Error",
        description: "The prescription analysis service is not configured. Please contact support or check the documentation.",
        variant: "destructive",
        duration: 10000,
      });
      setIsUploadingToStorage(false);
      setIsAnalyzingWithCloudFunction(false);
      return;
    }

    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a prescription file to analyze.", variant: "destructive" });
      return;
    }
    if (!firebaseUser || !db || !storage) {
      toast({ title: "Authentication Error", description: "Cannot proceed. User not authenticated or Firebase services unavailable.", variant: "destructive" });
      return;
    }

    setIsUploadingToStorage(true);
    setIsAnalyzingWithCloudFunction(false);
    setExtractedMedicineNames([]);
    toast({ title: "Processing...", description: "Uploading prescription image..." });

    try {
      const storageFilePath = `users/${firebaseUser.uid}/prescriptions/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, storageFilePath);
      await uploadBytes(storageRef, selectedFile);
      const uploadedFileUrl = await getDownloadURL(storageRef);
      console.log("PrescriptionUploadForm onSubmit: Upload to Firebase Storage successful. URL:", uploadedFileUrl);
      setIsUploadingToStorage(false);
      setIsAnalyzingWithCloudFunction(true);
      toast({ title: "Processing...", description: "Analyzing image with AI... This may take a moment." });

      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(CLOUD_FUNCTION_URL, { method: 'POST', body: formData });
      setIsAnalyzingWithCloudFunction(false);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server error: ${response.status} ${response.statusText}. Failed to parse response.` };
        }
        console.error("Cloud Function Error Response:", errorData);
        toast({ title: "Analysis Failed", description: errorData?.error || "An unknown error occurred during AI analysis.", variant: "destructive", duration: 7000 });
        resetFormState(false); // Keep file selected for retry if user wants
        return;
      }

      const result = await response.json();
      console.log("PrescriptionUploadForm onSubmit: Cloud Function response:", result);

      if (result.medicines && Array.isArray(result.medicines)) {
        setExtractedMedicineNames(result.medicines);
        const medicationDetails: MedicationDetail[] = result.medicines.map((name: string) => ({
          name: name,
          dosage: '', // Dosage/frequency not extracted by this Python flow
          frequency: '',
          // 'info' field is not populated by this Python flow
        }));

        const prescriptionDocData: Omit<Prescription, 'id'> = {
          userId: firebaseUser.uid,
          fileName: selectedFile.name,
          uploadDate: new Date().toISOString(),
          status: 'needs_correction',
          extractedMedications: medicationDetails,
          userVerificationStatus: 'pending',
          imageUrl: uploadedFileUrl,
          storagePath: storageFilePath,
        };

        const prescriptionsColRef = collection(db, `users/${firebaseUser.uid}/prescriptions`);
        const docRef = await addDoc(prescriptionsColRef, prescriptionDocData);
        console.log("PrescriptionUploadForm onSubmit: Prescription saved to Firestore. ID:", docRef.id);

        onUploadSuccess({ ...prescriptionDocData, id: docRef.id });
        toast({
          title: "Analysis Complete",
          description: "Medicines extracted. Please review and verify them.",
        });
        // Don't reset fully here, let user see results. Next file selection will reset.
        // resetFormState(); // Or partial reset to allow new upload
      } else if (result.info) {
        setExtractedMedicineNames([]);
        toast({ title: "Analysis Information", description: result.info, variant: "default", duration: 7000 });
      } else {
        setExtractedMedicineNames([]);
        toast({ title: "Analysis Issue", description: "No medicines were extracted or an unexpected response was received from the AI.", variant: "destructive", duration: 7000 });
      }

    } catch (error: any) {
      console.error("PrescriptionUploadForm onSubmit: Error during upload or analysis.", error);
      toast({ title: "Operation Failed", description: error.message || "An unexpected error occurred. Please try again.", variant: "destructive" });
      setIsUploadingToStorage(false);
      setIsAnalyzingWithCloudFunction(false);
      setExtractedMedicineNames([]);
      // resetFormState(false); // Keep file for retry
    }
  };

  const isLoading = isUploadingToStorage || isAnalyzingWithCloudFunction;
  let currentLoadingStep = "";
  if (isUploadingToStorage) currentLoadingStep = "Uploading image...";
  else if (isAnalyzingWithCloudFunction) currentLoadingStep = "Analyzing with AI...";

  const canSubmit = !!selectedFile && !isLoading;
  const isCloudFunctionUrlPlaceholder = CLOUD_FUNCTION_URL === 'YOUR_CLOUD_FUNCTION_URL_HERE';


  return (
    <Card id="upload" className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Upload Prescription for AI Analysis</CardTitle>
        <CardDescription>Securely upload your prescription (JPG, PNG - max 10MB). Our AI will help extract medicine names.</CardDescription>
      </CardHeader>
      <CardContent>
        {isCloudFunctionUrlPlaceholder && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Service Configuration Incomplete</AlertTitle>
            <AlertDescription>
              The prescription analysis service is not yet configured. The URL for the analysis service is a placeholder.
              Please update the `CLOUD_FUNCTION_URL` constant in `src/components/insights/PrescriptionUploadForm.tsx` with your deployed Cloud Function URL.
              This feature will not work until this is configured.
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prescriptionFile-input" className="sr-only">Prescription File</Label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="prescriptionFile-input" className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg bg-muted/50 hover:bg-muted/80 border-border hover:border-primary transition-colors ${isLoading || isCloudFunctionUrlPlaceholder ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG (MAX. 10MB)</p>
                </div>
                <Input
                  id="prescriptionFile-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png"
                  disabled={isLoading || isCloudFunctionUrlPlaceholder}
                  ref={fileInputRef}
                />
              </label>
            </div>

            {selectedFileName && !imagePreviewUrl && !isLoading && (
              <div className="mt-4 p-3 border rounded-md bg-muted/30 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{selectedFileName}</p>
              </div>
            )}

            {imagePreviewUrl && (
              <div className="mt-4 p-2 border rounded-lg shadow-inner bg-muted/20">
                <p className="text-sm font-medium text-center mb-2 text-foreground">Image Preview:</p>
                <Image
                  src={imagePreviewUrl}
                  alt="Prescription preview"
                  width={400}
                  height={300}
                  className="rounded-md object-contain mx-auto max-h-[300px] w-auto"
                  data-ai-hint="prescription preview"
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit || isCloudFunctionUrlPlaceholder}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isLoading ? currentLoadingStep : (selectedFile ? 'Upload & Analyze Selected File' : 'Select a File to Upload & Analyze')}
          </Button>
        </form>

        {extractedMedicineNames.length > 0 && !isLoading && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Extracted Medicine Names:</h3>
            <Card className="bg-background/50 p-4">
              <ul className="list-disc list-inside space-y-1">
                {extractedMedicineNames.map((name, index) => (
                  <li key={index} className="text-sm text-foreground">{name}</li>
                ))}
              </ul>
            </Card>
            <p className="text-xs text-muted-foreground pt-2 text-center">
              Please verify these extracted names. You can edit them and add dosages/frequencies in the Insights Hub after this initial extraction.
            </p>
          </div>
        )}
        {!isLoading && selectedFile && extractedMedicineNames.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground text-center">No medicines extracted, or analysis did not return specific names. Please check the image quality or try again.</p>
        )}
      </CardContent>
    </Card>
  );
}
