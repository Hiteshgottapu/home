
'use client';
import { useState, ChangeEvent } from 'react';
import Image from 'next/image'; // Using next/image for optimized images
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ExtractScriptDetailsOutput } from '../ai/flows/extract-script-details-flow';

export function ScriptRecognizer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [details, setDetails] = useState<ExtractScriptDetailsOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    setDetails(null); // Reset details on new file selection
    setError(null); // Reset error

    if (preview) {
      URL.revokeObjectURL(preview); // Clean up previous preview
    }

    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "Please select an image under 10MB.", variant: "destructive" });
        setFile(null);
        setPreview(null);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, or WEBP image.", variant: "destructive" });
        setFile(null);
        setPreview(null);
        return;
      }
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview(null);
    }
  };

  const recognize = async () => {
    if (!file) {
      toast({ title: "No File", description: "Please select an image file first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);
    setDetails(null);

    try {
      const imageBase64 = await toBase64(file);
      const res = await fetch('/api/script-recognition', {
        method: 'POST',
        body: JSON.stringify({ image: imageBase64 }), // Send as data URI
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
      }

      const data: ExtractScriptDetailsOutput = await res.json();
      setDetails(data);
      toast({ title: "Analysis Complete", description: "Script details extracted below." });
    } catch (err: any) {
      console.error("Recognition error:", err);
      setError(err.message || 'Failed to process the script.');
      toast({ title: "Analysis Failed", description: err.message || 'An unexpected error occurred.', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">AI Script Reader</CardTitle>
        <CardDescription>Upload an image of a prescription or medical script to extract its details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="script-file" className="text-base">Upload Script Image</Label>
          <Input id="script-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
        </div>

        {preview && (
          <div className="mt-4 p-2 border rounded-lg shadow-inner bg-muted/30">
            <p className="text-sm font-medium text-center mb-2 text-foreground">Image Preview:</p>
            <Image
              src={preview}
              alt="Script preview"
              width={500}
              height={350}
              className="rounded-md object-contain mx-auto max-h-[350px] w-auto"
              data-ai-hint="prescription medical script"
            />
          </div>
        )}

        <Button onClick={recognize} disabled={!file || loading} className="w-full text-base py-3">
          {loading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          {loading ? 'Analyzing Script...' : 'Extract Details'}
        </Button>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive flex items-center gap-2">
            <AlertTriangle />
            <p>{error}</p>
          </div>
        )}

        {details && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2"><CheckCircle className="text-green-500"/>Extracted Details:</h3>
            {details.patientName && <p><strong>Patient:</strong> {details.patientName}</p>}
            {details.doctorName && <p><strong>Doctor:</strong> {details.doctorName}</p>}
            {details.prescriptionDate && <p><strong>Date:</strong> {details.prescriptionDate}</p>}

            {details.medications && details.medications.length > 0 && (
              <div>
                <h4 className="text-lg font-medium">Medications:</h4>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  {details.medications.map((med, index) => (
                    <li key={index}>
                      <strong>{med.name}</strong>
                      {med.dosage && <span> - Dosage: {med.dosage}</span>}
                      {med.frequency && <span> - Frequency: {med.frequency}</span>}
                      {med.notes && <span className="block text-sm text-muted-foreground italic">  Notes: {med.notes}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
             {details.overallConfidence !== undefined && (
                <p className="text-sm"><strong>AI Overall Confidence:</strong> {(details.overallConfidence * 100).toFixed(0)}%</p>
            )}
            {details.unclearSections && details.unclearSections.length > 0 && (
                 <div>
                    <h4 className="text-md font-medium text-amber-700">Unclear Sections:</h4>
                    <ul className="list-disc pl-5 text-sm text-amber-600">
                        {details.unclearSections.map((section, idx) => <li key={idx}>{section}</li>)}
                    </ul>
                </div>
            )}
            <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Raw JSON Output</summary>
                <pre className="mt-2 bg-muted/50 p-3 rounded-md text-xs overflow-x-auto">{JSON.stringify(details, null, 2)}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file); // This creates a data URI (e.g., "data:image/jpeg;base64,...")
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
