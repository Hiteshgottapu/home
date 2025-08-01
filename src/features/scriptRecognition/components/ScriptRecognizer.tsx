
'use client';
import { useState, ChangeEvent, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle, Camera, FilePenLine, Aperture, XCircle, RefreshCw, BookOpen, ListChecks, ShieldAlert, InfoIcon as Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ExtractScriptDetailsOutput, MedicationDetail as ExtractedMedicationDetail } from '../ai/flows/extract-script-details-flow';
import type { MedicineInfo, MedicationDetail } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ViewState = 'select_input' | 'camera_active' | 'image_preview' | 'show_results';

interface ScriptAnalysisData extends Omit<ExtractScriptDetailsOutput, 'medications' | 'unclearSections'> {
  medications?: MedicationDetail[]; 
}

export function ScriptRecognizer() {
  const [currentView, setCurrentView] = useState<ViewState>('select_input');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const [analysisDetails, setAnalysisDetails] = useState<ScriptAnalysisData | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup for blob URLs
    const currentPreview = previewSrc;
    return () => {
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [previewSrc]);

  useEffect(() => {
    if (cameraError) {
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: cameraError,
      });
      setCameraError(null); // Reset after showing toast
    }
  }, [cameraError, toast]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error: any) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            setCameraError('Camera permission was denied. Please enable it in your browser settings.');
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            setCameraError('No camera found. Please ensure a camera is connected and enabled.');
        } else {
            setCameraError('Could not access the camera. Please ensure it is not in use by another application.');
        }
        setCurrentView('select_input'); // Revert to selection if camera fails critically
      }
    };
    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
    };

    if (currentView === 'camera_active') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { // Cleanup function
      stopCamera();
    };
  }, [currentView]);


  const fetchAndSetDetailedMedicineInfo = useCallback(async (medications: ExtractedMedicationDetail[]) => {
    const fetchPromises = medications.map(async (med) => {
      if (!med.name) return { ...med, info: undefined, isLoadingInfo: false, infoError: undefined };

      try {
        const res = await fetch('/api/medicine-info', {
          method: 'POST',
          body: JSON.stringify({ medicineName: med.name }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to fetch details' }));
          throw new Error(errorData.error || `HTTP error ${res.status}`);
        }
        const info: MedicineInfo = await res.json();
        return { ...med, info, isLoadingInfo: false, infoError: undefined } as MedicationDetail;
      } catch (err: any) {
        console.error(`Error fetching details for ${med.name}:`, err);
        return { ...med, info: undefined, isLoadingInfo: false, infoError: err.message || 'Could not load details.' } as MedicationDetail;
      }
    });
    
    const detailedMedications = await Promise.all(fetchPromises);

    setAnalysisDetails(prevDetails => {
      if (!prevDetails) return null;
      return { ...prevDetails, medications: detailedMedications };
    });

  }, []);


  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input

    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "Please select an image under 10MB.", variant: "destructive" });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, or WEBP image.", variant: "destructive" });
        return;
      }
      try {
        const base64 = await toBase64(file);
        setImageDataUri(base64);
        if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
        setPreviewSrc(URL.createObjectURL(file));
        setCurrentView('image_preview');
        setAnalysisDetails(null);
        setAnalysisError(null);
      } catch (err) {
        toast({ title: "File Processing Error", description: "Could not read the selected file.", variant: "destructive" });
      }
    }
  };

  const handleOpenCamera = () => {
    setCurrentView('camera_active');
    setHasCameraPermission(null); // Reset to re-check or re-prompt
    setAnalysisDetails(null);
    setAnalysisError(null);
    setImageDataUri(null);
    if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(null);
  };

  const handleSnapPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller size
        setImageDataUri(dataUrl);
        if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
        setPreviewSrc(dataUrl); // Use dataUrl directly for preview for captured images
        setCurrentView('image_preview');
      } else {
        setCameraError("Could not get canvas context to capture photo.");
        setCurrentView('select_input'); // Revert
      }
    }
  };

  const handleAnalyze = async () => {
    if (!imageDataUri) {
      toast({ title: "No Image Data", description: "No image is available for analysis.", variant: "destructive" });
      return;
    }
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysisDetails(null);

    try {
      const res = await fetch('/api/script-recognition', {
        method: 'POST',
        body: JSON.stringify({ image: imageDataUri }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
      }

      const data: ExtractScriptDetailsOutput = await res.json();
      
      // Prepare medications with isLoadingInfo state
      const medicationsWithLoadingState: MedicationDetail[] = data.medications?.map(med => ({
        ...med,
        isLoadingInfo: !!med.name, 
        info: undefined,
        infoError: undefined,
      })) || [];

      const { unclearSections, ...relevantDetails } = data; // Exclude unclearSections

      setAnalysisDetails({ ...relevantDetails, medications: medicationsWithLoadingState });
      setCurrentView('show_results');
      toast({ title: "Analysis Complete", description: "Script details extracted. Fetching detailed medicine info..." });

      if (medicationsWithLoadingState.length > 0) {
        fetchAndSetDetailedMedicineInfo(medicationsWithLoadingState as ExtractedMedicationDetail[]);
      }

    } catch (err: any) {
      console.error("Analysis error:", err);
      setAnalysisError(err.message || 'Failed to process the script.');
      toast({ title: "Analysis Failed", description: err.message || 'An unexpected error occurred.', variant: "destructive" });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const resetToStart = () => {
    setCurrentView('select_input');
    setImageDataUri(null);
    if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(null);
    setAnalysisDetails(null);
    setAnalysisError(null);
    setIsLoadingAnalysis(false);
    setHasCameraPermission(null); // Reset camera permission state
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border border-border">
      <CardHeader className="text-center border-b border-border">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FilePenLine className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold text-primary">ScriptAssist</CardTitle>
        </div>
        <CardDescription className="text-lg text-muted-foreground">Instant Prescription Decoder</CardDescription>
        <p className="text-sm text-muted-foreground mt-1">Snap a photo or upload an image of your prescription to get quick insights.</p>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {currentView === 'select_input' && (
          <div className="space-y-4">
            <Button onClick={handleOpenCamera} className="w-full text-base py-6 bg-green-600 hover:bg-green-700 text-white shadow-md transition-all duration-200 active:scale-95">
              <Camera className="mr-2 h-5 w-5" /> Capture with Camera
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full text-base py-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 active:scale-95">
              <UploadCloud className="mr-2 h-5 w-5" /> Upload from Gallery
            </Button>
            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} ref={fileInputRef} className="hidden" />
          </div>
        )}

        {currentView === 'camera_active' && (
          <div className="space-y-4 flex flex-col items-center">
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>{cameraError || "Please enable camera permissions in your browser settings and try again."}</AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === null && !cameraError && ( // Show loader only if no specific error yet
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
                <p>Requesting camera access...</p>
              </div>
            )}
            {hasCameraPermission && (
              <>
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-black shadow-inner" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="flex gap-4 w-full pt-2">
                  <Button onClick={() => setCurrentView('select_input')} variant="outline" className="flex-1 text-base py-3 transition-all duration-200 active:scale-95">
                    <XCircle className="mr-2 h-5 w-5" /> Cancel Camera
                  </Button>
                  <Button onClick={handleSnapPhoto} className="flex-1 text-base py-3 bg-red-600 hover:bg-red-700 text-white transition-all duration-200 active:scale-95">
                    <Aperture className="mr-2 h-5 w-5" /> Snap Photo
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {currentView === 'image_preview' && previewSrc && (
          <div className="space-y-4 flex flex-col items-center">
            <div className="p-2 border rounded-lg shadow-inner bg-muted/20 w-full">
              <Image src={previewSrc} alt="Script preview" width={600} height={400} className="rounded-md object-contain mx-auto max-h-[400px] w-auto" data-ai-hint="prescription document image" />
            </div>
            {analysisError && (
              <Alert variant="destructive" className="w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Previous Analysis Error</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-4 w-full pt-2">
              <Button onClick={resetToStart} variant="outline" className="flex-1 text-base py-3 transition-all duration-200 active:scale-95" disabled={isLoadingAnalysis}>
                <RefreshCw className="mr-2 h-5 w-5" /> Change Photo / Retake
              </Button>
              <Button onClick={handleAnalyze} disabled={isLoadingAnalysis || !imageDataUri} className="flex-1 text-base py-3 bg-primary text-primary-foreground transition-all duration-200 active:scale-95">
                {isLoadingAnalysis ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                {isLoadingAnalysis ? 'Analyzing...' : 'Analyze Prescription'}
              </Button>
            </div>
          </div>
        )}

        {currentView === 'show_results' && analysisDetails && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-3 bg-muted/30 border-b">
                <CardTitle className="text-xl text-primary">Extraction Results</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {analysisDetails.patientName && <p><strong className="font-medium text-foreground">Patient:</strong> {analysisDetails.patientName}</p>}
                {analysisDetails.doctorName && <p><strong className="font-medium text-foreground">Doctor:</strong> {analysisDetails.doctorName}</p>}
                {analysisDetails.prescriptionDate && <p><strong className="font-medium text-foreground">Date:</strong> {analysisDetails.prescriptionDate}</p>}

                {analysisDetails.medications && analysisDetails.medications.length > 0 ? (
                  <div>
                    <h4 className="text-md font-semibold mt-3 mb-1.5 text-foreground">Medications:</h4>
                    <Accordion type="multiple" className="w-full space-y-2">
                      {analysisDetails.medications.map((med, index) => (
                        <AccordionItem value={`med-${index}`} key={index} className="border rounded-md bg-background/50 shadow-sm hover:shadow-md transition-shadow">
                          <AccordionTrigger className="px-4 py-2.5 text-sm font-medium hover:no-underline hover:bg-muted/30 rounded-t-md">
                            {med.name || "Unnamed Medication"}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-3 pt-2 space-y-3 text-sm border-t">
                            <div>
                                <p className="font-semibold text-xs text-muted-foreground mb-0.5">OCR Extracted:</p>
                                {med.dosage && <p><strong className="text-muted-foreground">Dosage:</strong> {med.dosage}</p>}
                                {med.frequency && <p><strong className="text-muted-foreground">Frequency:</strong> {med.frequency}</p>}
                                {med.notes && <p><strong className="text-muted-foreground">Notes:</strong> {med.notes}</p>}
                                {!med.dosage && !med.frequency && !med.notes && <p className="text-muted-foreground italic text-xs">No specific dosage/frequency/notes extracted by OCR.</p>}
                            </div>
                            {med.isLoadingInfo && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2 text-muted-foreground">Loading details...</span></div>}
                            {med.infoError && <Alert variant="destructive" className="mt-2"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading Details</AlertTitle><AlertDescription>{med.infoError}</AlertDescription></Alert>}
                            {med.info && !med.isLoadingInfo && (
                              <div className="space-y-2 pt-2 mt-2 border-t border-dashed">
                                <p className="font-semibold text-xs text-muted-foreground mb-0.5">Detailed Information:</p>
                                <div><h5 className="font-medium text-foreground flex items-center gap-1.5"><BookOpen size={14}/> Overview:</h5><p className="text-muted-foreground text-xs">{med.info.overview}</p></div>
                                <div><h5 className="font-medium text-foreground flex items-center gap-1.5"><ListChecks size={14}/> Common Uses:</h5><ul className="list-disc list-inside pl-4 text-muted-foreground text-xs">{med.info.commonUses.map((use, i) => <li key={i}>{use}</li>)}</ul></div>
                                <div><h5 className="font-medium text-foreground flex items-center gap-1.5"><Info size={14}/> General Dosage:</h5><p className="text-muted-foreground text-xs">{med.info.generalDosageInformation}</p></div>
                                <div><h5 className="font-medium text-foreground flex items-center gap-1.5"><ShieldAlert size={14}/> Precautions:</h5><ul className="list-disc list-inside pl-4 text-muted-foreground text-xs">{med.info.commonPrecautions.map((caution, i) => <li key={i}>{caution}</li>)}</ul></div>
                                <Card className="mt-3 p-2 border-amber-500 bg-amber-50/70 rounded-md shadow-none">
                                  <p className="text-xs text-amber-700 font-semibold">Disclaimer:</p>
                                  <p className="text-xs text-amber-600">{med.info.disclaimer}</p>
                                </Card>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : (
                   <p className="text-sm text-muted-foreground italic pt-2">No medications were clearly extracted from this image.</p>
                )}
                {analysisDetails.overallConfidence !== undefined && (
                  <p className="text-sm pt-2 border-t border-dashed"><strong className="font-medium text-foreground">AI Overall Confidence:</strong> {(analysisDetails.overallConfidence * 100).toFixed(0)}%</p>
                )}
              </CardContent>
            </Card>
            <Button onClick={resetToStart} variant="outline" className="w-full text-base py-3 transition-all duration-200 active:scale-95">
              <RefreshCw className="mr-2 h-5 w-5" /> Start New Scan
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="text-center block pt-4 pb-6 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">Ensure the image is clear and well-lit for best results. Max file size: 10MB.</p>
      </CardFooter>
    </Card>
  );
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
