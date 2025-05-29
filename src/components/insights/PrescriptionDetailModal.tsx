
"use client";

import type { Prescription, MedicationDetail } from '@/types'; // MedicineInfo is implicitly available via MedicationDetail
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, FileText, CalendarDays, Pill, Thermometer, Repeat, Info, ListChecks, ShieldAlert, BookOpen, Trash2, PlusCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '../ui/card';

interface PrescriptionDetailModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveVerification: (updatedPrescription: Prescription) => void;
}

export function PrescriptionDetailModal({ prescription, isOpen, onClose, onSaveVerification }: PrescriptionDetailModalProps) {
  const [editableMedications, setEditableMedications] = useState<MedicationDetail[]>([]);
  // const [userNotes, setUserNotes] = useState(''); // Kept for potential future use
  const { toast } = useToast();

  useEffect(() => {
    if (prescription) {
      // Deep copy, ensuring info is also copied if present
      setEditableMedications(JSON.parse(JSON.stringify(prescription.extractedMedications || [])));
    } else {
      setEditableMedications([]);
    }
    // setUserNotes(prescription?.userNotes || ''); // if userNotes field is added to Prescription
  }, [prescription]);

  if (!isOpen || !prescription) return null;

  const handleMedicationChange = (index: number, field: keyof Omit<MedicationDetail, 'info'>, value: string) => {
    const updatedMeds = [...editableMedications];
    updatedMeds[index] = { ...updatedMeds[index], [field]: value };
    setEditableMedications(updatedMeds);
  };
  
  const handleAddNewMedication = () => {
    setEditableMedications([...editableMedications, { name: '', dosage: '', frequency: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    const confirmRemove = confirm('Are you sure you want to remove this medication? This only removes it from the current verification session.');
    if (confirmRemove) {
      setEditableMedications(editableMedications.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    const allMedsValid = editableMedications.every(med => med.name.trim() && med.dosage.trim() && med.frequency.trim());
    if (!allMedsValid && editableMedications.length > 0) { // Allow saving if no meds (e.g., user removed all)
      toast({
        title: "Incomplete Medication Details",
        description: "Please ensure all medication fields (name, dosage, frequency) are filled, or remove incomplete entries.",
        variant: "destructive",
      });
      return;
    }

    const updatedPrescriptionData: Prescription = {
      ...prescription,
      extractedMedications: editableMedications,
      userVerificationStatus: 'verified', 
      status: 'verified', 
    };
    onSaveVerification(updatedPrescriptionData);
    // Toast is handled by parent component after successful Firestore update
    onClose();
  };
  
  const getStatusVariant = (status: Prescription['status']) => {
    switch (status) {
      case 'verified': return 'default';
      case 'needs_correction': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-[70vw] h-[85vh] md:h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Verify Prescription: {prescription.fileName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1 text-sm">
            <CalendarDays className="h-4 w-4" /> Uploaded on {format(new Date(prescription.uploadDate), "PPpp")}
            <Badge variant={getStatusVariant(prescription.status)} className="ml-2 capitalize">{prescription.status}</Badge>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
          {prescription.ocrConfidence && (
             <div className={`flex items-center p-3 rounded-md ${prescription.ocrConfidence > 0.7 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border`}>
                {prescription.ocrConfidence > 0.7 ? <CheckCircle className="h-5 w-5 text-green-600 mr-2 shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-600 mr-2 shrink-0" />}
                <p className="text-sm">
                  AI Extraction Confidence: <span className={`font-semibold ${prescription.ocrConfidence > 0.7 ? 'text-green-700' : 'text-amber-700'}`}>{(prescription.ocrConfidence * 100).toFixed(1)}%</span>.
                  {prescription.ocrConfidence <= 0.7 && " Please verify extracted text carefully."}
                </p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Medications Details</h3>
            <p className="text-sm text-muted-foreground mb-3">Verify the AI-extracted information against your prescription and make corrections if needed. You can also add or remove medications.</p>
            
            {editableMedications.length > 0 ? (
              <div className="space-y-4">
                {editableMedications.map((med, index) => (
                  <Card key={index} className="bg-card/80 p-4 space-y-3 relative group border shadow-sm">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 opacity-60 hover:opacity-100 text-destructive hover:bg-destructive/10 z-10"
                        onClick={() => handleRemoveMedication(index)}
                        aria-label="Remove medication"
                      >
                       <Trash2 size={16}/>
                      </Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 items-end">
                      <div>
                        <Label htmlFor={`medName-${index}`} className="text-xs flex items-center gap-1 mb-1"><Pill size={14}/>Name</Label>
                        <Input id={`medName-${index}`} value={med.name} onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} placeholder="e.g., Atorvastatin" />
                      </div>
                      <div>
                        <Label htmlFor={`medDosage-${index}`} className="text-xs flex items-center gap-1 mb-1"><Thermometer size={14}/>Dosage</Label>
                        <Input id={`medDosage-${index}`} value={med.dosage} onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)} placeholder="e.g., 10mg" />
                      </div>
                      <div>
                        <Label htmlFor={`medFrequency-${index}`} className="text-xs flex items-center gap-1 mb-1"><Repeat size={14}/>Frequency</Label>
                        <Input id={`medFrequency-${index}`} value={med.frequency} onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)} placeholder="e.g., Once daily" />
                      </div>
                    </div>
                    {med.info && (
                        <Accordion type="single" collapsible className="w-full pt-2">
                            <AccordionItem value={`info-${index}`} className="border-t ">
                                <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:no-underline py-2 hover:text-primary">
                                    Show/Hide AI Generated Information
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2 pt-2 pb-1 text-xs">
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
                                    <div className="mt-2 p-2 border border-amber-500 bg-amber-50/70 rounded-md">
                                        <p className="text-xs text-amber-700 font-medium">Disclaimer:</p>
                                        <p className="text-xs text-amber-600">{med.info.disclaimer}</p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">No medications extracted or added yet for this verification session.</p>
            )}
            <Button variant="outline" size="sm" onClick={handleAddNewMedication} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Medication Manually
            </Button>
          </div>
        </div>

        <DialogFooter className="p-6 border-t mt-auto sticky bottom-0 bg-card z-10">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}><CheckCircle className="mr-2 h-4 w-4" /> Save Corrections & Mark as Verified</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
