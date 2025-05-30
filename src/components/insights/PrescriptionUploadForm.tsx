
"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { Prescription, MedicationDetail } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png']; // Recommended for direct image analysis by Gemini in CF

const PrescriptionUploadSchema = z.object({
  prescriptionFile: z
    .custom<FileList>()
    .refine((files) => files && files.length === 1, "Please select a file.")
    .refine((files) => files && files[0]?.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
    .refine(
      (files) => files && ALLOWED_FILE_TYPES.includes(files[0]?.type),
      "Only .jpg and .png files are recommended for this feature."
    )
    .optional(), // Optional because we manage the file in component state
});

type PrescriptionUploadFormValues = z.infer<typeof PrescriptionUploadSchema>;

interface PrescriptionUploadFormProps {
  onUploadSuccess: (prescription: Prescription) => void;
}

// IMPORTANT: Replace this with your actual deployed Cloud Function URL
const CLOUD_FUNCTION_URL = 'YOUR_CLOUD_FUNCTION_URL_HERE';

export function PrescriptionUploadForm({ onUploadSuccess }: PrescriptionUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  const [isUploadingToStorage, setIsUploadingToStorage] = useState(false);
  const [isAnalyzingWithCloudFunction, setIsAnalyzingWithCloudFunction] = useState(false);
  const [extractedMedicineNames, setExtractedMedicineNames] = useState<string[]>([]);

  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset, setValue, clearErrors } = useForm<PrescriptionUploadFormValues>({
    resolver: zodResolver(PrescriptionUploadSchema),
    defaultValues: {
      prescriptionFile: undefined,
    }
  });

  useEffect(() => {
    const currentPreviewUrl = imagePreviewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const resetFormState = () => {
    reset(); // Resets react-hook-form
    setSelectedFile(null);
    setSelectedFileName(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setExtractedMedicineNames([]);
    setIsUploadingToStorage(false);
    setIsAnalyzingWithCloudFunction(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("PrescriptionUploadForm handleFileChange: Event triggered.");
    const files = event.target.files;
    clearErrors('prescriptionFile');
    setExtractedMedicineNames([]); // Clear previous results

    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type and size manually for immediate feedback
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a JPG or PNG image.", variant: "destructive" });
        resetFormState();
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File Too Large", description: "Maximum file size is 10MB.", variant: "destructive" });
        resetFormState();
        return;
      }
      
      console.log("PrescriptionUploadForm handleFileChange: File selected -", file.name, file.type, file.size);
      // setValue('prescriptionFile', files, { shouldValidate: true }); // RHF validation done via Zod on submit
      setSelectedFile(file);
      setSelectedFileName(file.name);

      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (file.type.startsWith('image/')) {
        setImagePreviewUrl(URL.createObjectURL(file));
      } else {
        setImagePreviewUrl(null); // Should not happen if ALLOWED_FILE_TYPES is enforced
      }
    } else {
      console.log("PrescriptionUploadForm handleFileChange: No file selected or selection cancelled.");
      // setValue('prescriptionFile', undefined, { shouldValidate: true }); // RHF validation
      setSelectedFile(null);
      setSelectedFileName(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
    }
  };

  const onSubmit: SubmitHandler<PrescriptionUploadFormValues> = async (dataFromRHF) => {
    console.log("PrescriptionUploadForm onSubmit: Form submitted.");
    console.log({ dataFromRHF, selectedFileFromState: selectedFile, errorsFromRHF: errors });

    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a prescription file to analyze.", variant: "destructive" });
      return;
    }

    if (!firebaseUser || !db || !storage) {
      toast({ title: "Authentication Error", description: "Cannot proceed. User not authenticated or Firebase services unavailable.", variant: "destructive" });
      return;
    }

    if (CLOUD_FUNCTION_URL === 'YOUR_CLOUD_FUNCTION_URL_HERE') {
      toast({ title: "Configuration Error", description: "Cloud Function URL is not configured in the frontend code. Please contact support.", variant: "destructive" });
      console.error("CRITICAL: CLOUD_FUNCTION_URL is not set in PrescriptionUploadForm.tsx");
      return;
    }

    setIsUploadingToStorage(true);
    setIsAnalyzingWithCloudFunction(false);
    setExtractedMedicineNames([]);

    const fileToProcess = selectedFile;

    try {
      console.log(`PrescriptionUploadForm onSubmit: Step 1 - Uploading "${fileToProcess.name}" to Firebase Storage...`);
      const storageFilePath = `users/${firebaseUser.uid}/prescriptions/${Date.now()}_${fileToProcess.name}`;
      const storageRef = ref(storage, storageFilePath);
      await uploadBytes(storageRef, fileToProcess);
      const uploadedFileUrl = await getDownloadURL(storageRef); // Renamed from imageUrl for clarity
      console.log("PrescriptionUploadForm onSubmit: Step 1 - Upload to Firebase Storage successful. File URL:", uploadedFileUrl);
      setIsUploadingToStorage(false);
      setIsAnalyzingWithCloudFunction(true);
      
      const formData = new FormData();
      formData.append('image', fileToProcess);

      console.log("PrescriptionUploadForm onSubmit: Step 2 - Calling Cloud Function for medicine extraction...");
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        body: formData,
      });

      setIsAnalyzingWithCloudFunction(false);

      if (!response.ok) {
        let errorData = { error: `Server error: ${response.status} ${response.statusText}` };
        try {
          errorData = await response.json();
        } catch (e) {
          console.warn("Could not parse error response as JSON from Cloud Function", e);
        }
        console.error("Cloud Function Error Response:", errorData);
        toast({ title: "Analysis Failed", description: errorData.error || "An unknown error occurred during analysis.", variant: "destructive" });
        // Don't reset form here, user might want to see the error with current file
        return;
      }

      const result = await response.json();
      console.log("PrescriptionUploadForm onSubmit: Step 2 - Cloud Function response:", result);
      
      if (result.medicines && Array.isArray(result.medicines)) {
        setExtractedMedicineNames(result.medicines);
        
        const medicationDetails: MedicationDetail[] = result.medicines.map((name: string) => ({
          name: name,
          dosage: '', // Not extracted by this Python flow
          frequency: '', // Not extracted by this Python flow
          // 'info' field is not populated by this Python flow
        }));

        console.log("PrescriptionUploadForm onSubmit: Step 3 - Preparing to save prescription to Firestore...");
        const prescriptionDocData: Omit<Prescription, 'id'> = {
          userId: firebaseUser.uid,
          fileName: fileToProcess.name,
          uploadDate: new Date().toISOString(),
          status: 'needs_correction', // Default status after this extraction, needs user verification
          extractedMedications: medicationDetails,
          userVerificationStatus: 'pending',
          imageUrl: uploadedFileUrl, // URL from Firebase Storage
          storagePath: storageFilePath,
          // ocrConfidence is not provided by this Python flow
        };
        
        const prescriptionsColRef = collection(db, `users/${firebaseUser.uid}/prescriptions`);
        const docRef = await addDoc(prescriptionsColRef, prescriptionDocData);
        console.log("PrescriptionUploadForm onSubmit: Step 3 - Prescription saved to Firestore. Document ID:", docRef.id);

        onUploadSuccess({ ...prescriptionDocData, id: docRef.id });
        toast({
          title: "Analysis Complete",
          description: "Medicines extracted. Please review and verify them in the list below or in the Insights Hub.",
        });
        
        // Reset form for next upload after a delay to allow user to see results
        // setTimeout(() => {
        //   resetFormState();
        // }, 3000); 
        // User can choose to upload another one by selecting a new file, which also resets.

      } else if (result.info) { // Handle cases like content blocked by Gemini
        setExtractedMedicineNames([]);
        toast({ title: "Analysis Information", description: result.info, variant: "default", duration: 7000});
      } else {
        setExtractedMedicineNames([]);
        toast({ title: "Analysis Issue", description: "No medicines were extracted or an unexpected response was received from the AI.", variant: "destructive" });
      }

    } catch (error: any) {
      console.error("PrescriptionUploadForm onSubmit: Error during upload or analysis.", error);
      toast({ title: "Upload & Analysis Failed", description: error.message || "An unexpected error occurred. Please try again.", variant: "destructive" });
      setIsUploadingToStorage(false);
      setIsAnalyzingWithCloudFunction(false);
      setExtractedMedicineNames([]);
      // Optionally reset form fully on critical errors if desired.
      // resetFormState();
    }
  };
  
  const isLoading = isUploadingToStorage || isAnalyzingWithCloudFunction;
  const currentLoadingStep = isUploadingToStorage ? "Uploading image..." : isAnalyzingWithCloudFunction ? "Analyzing with AI..." : null;
  const canSubmit = !!selectedFile && !isLoading;

  return (
    <Card id="upload" className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Upload Prescription for AI Analysis</CardTitle>
        <CardDescription>Securely upload your prescription (JPG, PNG - max 10MB). Our AI will help extract medicine names.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prescriptionFile-input" className="sr-only">Prescription File</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="prescriptionFile-input" className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg bg-muted/50 hover:bg-muted/80 border-border hover:border-primary transition-colors ${isLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">JPEG, PNG (MAX. 10MB)</p>
                    </div>
                    <Input 
                      id="prescriptionFile-input" 
                      type="file" 
                      className="hidden"
                      // {...register("prescriptionFile")} // We handle file state directly, RHF is for schema structure
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png"
                      disabled={isLoading}
                    />
                </label>
            </div>
            {/* RHF errors for 'prescriptionFile' would be displayed here if we fully used register */}
            {/* For now, direct toast messages cover file validation */}
            
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
          
          <Button type="submit" className="w-full" disabled={!canSubmit}>
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

    