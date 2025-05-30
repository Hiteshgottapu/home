
'use client';
import { useState, ChangeEvent, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle, Camera, FilePenLine, Aperture, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ExtractScriptDetailsOutput } from '../ai/flows/extract-script-details-flow';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ViewState = 'select_input' | 'camera_active' | 'image_preview' | 'show_results';

export function ScriptRecognizer() {
  const [currentView, setCurrentView] = useState<ViewState>('select_input');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null); // For analysis
  const [previewSrc, setPreviewSrc] = useState<string | null>(null); // For <Image />

  const [analysisDetails, setAnalysisDetails] = useState<ExtractScriptDetailsOutput | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewSrc && previewSrc.startsWith('blob:')) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [previewSrc]);

  // Effect for camera permission toast
  useEffect(() => {
    if (cameraError) {
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: cameraError,
      });
      setCameraError(null); // Reset error after showing toast
    }
  }, [cameraError, toast]);

  // Effect for managing camera stream
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
        setCurrentView('select_input'); // Go back if camera fails
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

    return () => {
      stopCamera();
    };
  }, [currentView]);


  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Allow re-selection of the same file
    }

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
    setHasCameraPermission(null); // Reset permission status on opening camera
    setAnalysisDetails(null);
    setAnalysisError(null);
    setImageDataUri(null);
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for potentially smaller size
        setImageDataUri(dataUrl);
        if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
        setPreviewSrc(dataUrl);
        setCurrentView('image_preview');
      } else {
        setCameraError("Could not get canvas context to capture photo.");
        setCurrentView('select_input');
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
      setAnalysisDetails(data);
      setCurrentView('show_results');
      toast({ title: "Analysis Complete", description: "Script details extracted successfully." });
    } catch (err: any) {
      console.error("Analysis error:", err);
      setAnalysisError(err.message || 'Failed to process the script.');
      toast({ title: "Analysis Failed", description: err.message || 'An unexpected error occurred.', variant: "destructive" });
      // Keep currentView as 'image_preview' to allow retry or change photo
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
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FilePenLine className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold text-primary">ScriptAssist</CardTitle>
        </div>
        <CardDescription className="text-lg text-muted-foreground">
          Instant Prescription Decoder
        </CardDescription>
        <p className="text-sm text-muted-foreground mt-1">
            Snap a photo or upload an image of your prescription to get quick insights.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {currentView === 'select_input' && (
          <div className="space-y-4">
            <Button onClick={handleOpenCamera} className="w-full text-base py-6 bg-green-600 hover:bg-green-700 text-white shadow-md">
              <Camera className="mr-2 h-5 w-5" /> Capture with Camera
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full text-base py-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
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
                <AlertDescription>
                  {cameraError || "Please enable camera permissions in your browser settings to use this feature."}
                </AlertDescription>
              </Alert>
            )}
             {hasCameraPermission === null && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" />
                    <p>Requesting camera access...</p>
                </div>
            )}
            {hasCameraPermission && (
                <>
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-black shadow-inner" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="flex gap-4 w-full">
                        <Button onClick={() => setCurrentView('select_input')} variant="outline" className="flex-1 text-base py-3">
                            <XCircle className="mr-2 h-5 w-5" /> Cancel Camera
                        </Button>
                        <Button onClick={handleSnapPhoto} className="flex-1 text-base py-3 bg-red-600 hover:bg-red-700 text-white">
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
              <Image
                src={previewSrc}
                alt="Script preview"
                width={600}
                height={400}
                className="rounded-md object-contain mx-auto max-h-[400px] w-auto"
                data-ai-hint="prescription preview"
              />
            </div>
            {analysisError && (
              <Alert variant="destructive" className="w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-4 w-full">
                <Button onClick={resetToStart} variant="outline" className="flex-1 text-base py-3" disabled={isLoadingAnalysis}>
                    <RefreshCw className="mr-2 h-5 w-5" /> Change Photo / Retake
                </Button>
                <Button onClick={handleAnalyze} disabled={isLoadingAnalysis || !imageDataUri} className="flex-1 text-base py-3 bg-primary text-primary-foreground">
                    {isLoadingAnalysis ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                    {isLoadingAnalysis ? 'Analyzing...' : 'Analyze Prescription'}
                </Button>
            </div>
          </div>
        )}

        {currentView === 'show_results' && analysisDetails && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-primary/30 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-primary">Extraction Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {analysisDetails.patientName && <p><strong className="font-medium text-foreground">Patient:</strong> {analysisDetails.patientName}</p>}
                    {analysisDetails.doctorName && <p><strong className="font-medium text-foreground">Doctor:</strong> {analysisDetails.doctorName}</p>}
                    {analysisDetails.prescriptionDate && <p><strong className="font-medium text-foreground">Date:</strong> {analysisDetails.prescriptionDate}</p>}

                    {analysisDetails.medications && analysisDetails.medications.length > 0 && (
                    <div>
                        <h4 className="text-md font-semibold mt-3 mb-1.5 text-foreground">Medications:</h4>
                        <Accordion type="multiple" className="w-full space-y-2">
                        {analysisDetails.medications.map((med, index) => (
                            <AccordionItem value={`med-${index}`} key={index} className="border rounded-md bg-background/50 shadow-sm">
                            <AccordionTrigger className="px-4 py-2.5 text-sm font-medium hover:no-underline">
                                {med.name || "Unnamed Medication"}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-3 pt-2 space-y-1 text-sm border-t">
                                {med.dosage && <p><strong className="text-muted-foreground">Dosage:</strong> {med.dosage}</p>}
                                {med.frequency && <p><strong className="text-muted-foreground">Frequency:</strong> {med.frequency}</p>}
                                {med.notes && <p><strong className="text-muted-foreground">Notes:</strong> {med.notes}</p>}
                                {!med.dosage && !med.frequency && !med.notes && <p className="text-muted-foreground italic">No further details extracted for this medication.</p>}
                            </AccordionContent>
                            </AccordionItem>
                        ))}
                        </Accordion>
                    </div>
                    )}
                    {analysisDetails.overallConfidence !== undefined && (
                        <p className="text-sm pt-2 border-t border-dashed"><strong className="font-medium text-foreground">AI Overall Confidence:</strong> {(analysisDetails.overallConfidence * 100).toFixed(0)}%</p>
                    )}
                    {analysisDetails.unclearSections && analysisDetails.unclearSections.length > 0 && (
                        <div className="pt-2 border-t border-dashed">
                            <h4 className="text-md font-medium text-amber-700">Potentially Unclear Sections:</h4>
                            <ul className="list-disc pl-5 text-sm text-amber-600">
                                {analysisDetails.unclearSections.map((section, idx) => <li key={idx}>{section}</li>)}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
            <details className="mt-2 text-xs bg-muted/30 p-2 rounded-md">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">Show Raw JSON Output</summary>
                <pre className="mt-2 bg-black/80 text-white p-3 rounded-md text-xs overflow-x-auto">{JSON.stringify(analysisDetails, null, 2)}</pre>
            </details>
             <Button onClick={resetToStart} variant="outline" className="w-full text-base py-3">
                <RefreshCw className="mr-2 h-5 w-5" /> Start New Scan
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="text-center block pt-4 pb-6">
        <p className="text-xs text-muted-foreground">
          Ensure the image is clear and well-lit for best results. Max file size: 10MB.
        </p>
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
    