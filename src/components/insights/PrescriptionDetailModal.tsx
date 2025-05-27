"use client";

import type { Prescription, MedicationDetail } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, FileText, CalendarDays, Pill, Thermometer, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionDetailModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveVerification: (updatedPrescription: Prescription) => void;
}

export function PrescriptionDetailModal({ prescription, isOpen, onClose, onSaveVerification }: PrescriptionDetailModalProps) {
  const [editableMedications, setEditableMedications] = useState<MedicationDetail[]>([]);
  const [userNotes, setUserNotes] = useState(''); // For future use
  const { toast } = useToast();

  useEffect(() => {
    if (prescription?.extractedMedications) {
      setEditableMedications(JSON.parse(JSON.stringify(prescription.extractedMedications))); // Deep copy
    } else {
      setEditableMedications([]);
    }
    // Reset notes or other form fields if prescription changes
    setUserNotes(''); 
  }, [prescription]);

  if (!prescription) return null;

  const handleMedicationChange = (index: number, field: keyof MedicationDetail, value: string) => {
    const updatedMeds = [...editableMedications];
    updatedMeds[index] = { ...updatedMeds[index], [field]: value };
    setEditableMedications(updatedMeds);
  };
  
  const handleAddNewMedication = () => {
    setEditableMedications([...editableMedications, { name: '', dosage: '', frequency: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    const약을_삭제하시겠습니까 = confirm('Are you sure you want to remove this medication?');
    if (약을_삭제하시겠습니까) {
      setEditableMedications(editableMedications.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    // Basic validation: ensure all fields in added medications are filled
    const allMedsValid = editableMedications.every(med => med.name.trim() && med.dosage.trim() && med.frequency.trim());
    if (!allMedsValid) {
      toast({
        title: "Incomplete Medication Details",
        description: "Please ensure all medication fields (name, dosage, frequency) are filled.",
        variant: "destructive",
      });
      return;
    }

    const updatedPrescriptionData: Prescription = {
      ...prescription,
      extractedMedications: editableMedications,
      userVerificationStatus: 'verified', // Mark as verified by user
      status: 'verified', // Update main status as well
    };
    onSaveVerification(updatedPrescriptionData);
    toast({
        title: "Verification Saved",
        description: "Your changes have been saved successfully.",
    });
    onClose();
  };
  
  const getStatusVariant = (status: Prescription['status']) => {
    // ... (same as PrescriptionCard)
    switch (status) {
      case 'verified': return 'default';
      case 'needs_correction': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Prescription: {prescription.fileName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <CalendarDays className="h-4 w-4" /> Uploaded on {format(new Date(prescription.uploadDate), "PPpp")}
            <Badge variant={getStatusVariant(prescription.status)} className="ml-2 capitalize">{prescription.status}</Badge>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-6 py-4">
          {prescription.ocrConfidence && (
             <div className={`flex items-center p-3 rounded-md ${prescription.ocrConfidence > 0.7 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border`}>
                {prescription.ocrConfidence > 0.7 ? <CheckCircle className="h-5 w-5 text-green-600 mr-2 shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-600 mr-2 shrink-0" />}
                <p className="text-sm">
                  AI Extraction Confidence: <span className={`font-semibold ${prescription.ocrConfidence > 0.7 ? 'text-green-700' : 'text-amber-700'}`}>{(prescription.ocrConfidence * 100).toFixed(1)}%</span>.
                  {prescription.ocrConfidence <= 0.7 && " Please verify details carefully."}
                </p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Extracted Medications</h3>
            <p className="text-sm text-muted-foreground mb-3">AI has extracted the following. Please verify against your prescription and correct if needed.</p>
            
            {editableMedications.length > 0 ? (
              <div className="space-y-4">
                {editableMedications.map((med, index) => (
                  <Card key={index} className="bg-card/50 p-4 space-y-3 relative group">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-6 w-6 opacity-50 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMedication(index)}
                        aria-label="Remove medication"
                      >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <Label htmlFor={`medName-${index}`} className="text-xs flex items-center gap-1"><Pill size={12}/>Name</Label>
                        <Input id={`medName-${index}`} value={med.name} onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} placeholder="e.g., Atorvastatin" />
                      </div>
                      <div>
                        <Label htmlFor={`medDosage-${index}`} className="text-xs flex items-center gap-1"><Thermometer size={12}/>Dosage</Label>
                        <Input id={`medDosage-${index}`} value={med.dosage} onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)} placeholder="e.g., 10mg" />
                      </div>
                      <div>
                        <Label htmlFor={`medFrequency-${index}`} className="text-xs flex items-center gap-1"><Repeat size={12}/>Frequency</Label>
                        <Input id={`medFrequency-${index}`} value={med.frequency} onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)} placeholder="e.g., Once daily" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">No medications extracted or added yet.</p>
            )}
            <Button variant="outline" size="sm" onClick={handleAddNewMedication} className="mt-4">
              + Add Medication
            </Button>
          </div>

          {/* Placeholder for future user notes */}
          {/* <div>
            <Label htmlFor="userNotes">Your Notes (Optional)</Label>
            <Textarea id="userNotes" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Add any relevant notes about this prescription..." />
          </div> */}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}><CheckCircle className="mr-2 h-4 w-4" /> Save Corrections & Verify</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
