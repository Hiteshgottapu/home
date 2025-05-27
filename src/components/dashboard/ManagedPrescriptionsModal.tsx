
"use client";

import type { Prescription } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadCardDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // Aliased DialogDescription
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardFooter as it's not directly used here for modal items
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { FileText, CalendarDays, Pill, Thermometer, Repeat, Percent, User, Stethoscope, X, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ManagedPrescriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptions: Prescription[];
}

export function ManagedPrescriptionsModal({ isOpen, onClose, prescriptions: initialPrescriptions }: ManagedPrescriptionsModalProps) {
  const [currentPrescriptions, setCurrentPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCurrentPrescriptions(initialPrescriptions); 
    }
  }, [isOpen, initialPrescriptions]);

  const handleDeleteClick = (prescription: Prescription) => {
    setPrescriptionToDelete(prescription);
  };

  const confirmDelete = () => {
    if (prescriptionToDelete) {
      setCurrentPrescriptions(prev => prev.filter(p => p.id !== prescriptionToDelete.id));
      toast({
        title: "Prescription Deleted",
        description: `"${prescriptionToDelete.fileName}" has been removed (mock).`,
        variant: "default" 
      });
      setPrescriptionToDelete(null); 
    }
  };

  const getStatusVariant = (status?: Prescription['status']) => {
    if (!status) return 'secondary';
    switch (status) {
      case 'verified': return 'default';
      case 'needs_correction': return 'destructive';
      case 'pending': return 'secondary';
      case 'analyzing': return 'outline';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

   const getStatusText = (status?: Prescription['status']) => {
    if (!status) return 'Unknown';
    switch (status) {
      case 'verified': return 'Verified';
      case 'needs_correction': return 'Needs Correction';
      case 'pending': return 'Pending Review';
      case 'analyzing': return 'Analyzing...';
      case 'error': return 'Analysis Error';
      default: return 'Unknown';
    }
  };
  
  if (!isOpen && currentPrescriptions.length === 0) { // Only render empty state if modal is open and no prescriptions
      return null; // Or a more sophisticated empty state component if preferred when modal is supposed to be open
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setPrescriptionToDelete(null); } }}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-[90vw] h-[90vh] md:h-[85vh] flex flex-col bg-card shadow-2xl rounded-lg border-border">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Your Managed Prescriptions
          </DialogTitle>
          <ShadCardDescription className="text-muted-foreground">
            Review images and extracted details from your uploaded prescriptions.
          </ShadCardDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-2"> {/* Adjusted padding here */}
          {currentPrescriptions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-ai-hint="document icon" />
                <p className="text-lg font-medium text-foreground">No Prescriptions Yet</p>
                <p className="text-muted-foreground">Looks like you haven't uploaded any prescriptions, or all have been removed.</p>
                <p className="text-sm text-muted-foreground mt-1">Upload new prescriptions via the Insights Hub.</p>
                <Button variant="link" asChild className="mt-4 text-primary" onClick={() => { onClose(); setPrescriptionToDelete(null); }}>
                    <Link href="/insights#upload">Go to Insights Hub</Link>
                </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4"> {/* Added py-4 for spacing within scroll area */}
              {currentPrescriptions.map((prescription, idx) => (
                <Card key={prescription.id || idx} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] group relative">
                  <AlertDialog open={!!prescriptionToDelete && prescriptionToDelete.id === prescription.id} onOpenChange={(open) => !open && setPrescriptionToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteClick(prescription)} 
                        className="absolute top-3 right-3 z-20 h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Delete prescription"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the prescription for "{prescriptionToDelete?.fileName}"? This action cannot be undone (locally for this session).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPrescriptionToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Image Side */}
                    <div className="bg-muted/30 p-4 flex items-center justify-center relative aspect-[3/4] md:aspect-auto">
                      {prescription.imageUrl ? (
                        <Image
                          src={prescription.imageUrl}
                          alt={`Prescription: ${prescription.fileName}`}
                          layout="fill"
                          objectFit="contain"
                          className="rounded-md"
                          data-ai-hint="prescription document"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                          <FileText className="h-20 w-20" />
                          <span>No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Details Side */}
                    <div className="p-5 flex flex-col">
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-lg text-primary truncate" title={prescription.fileName}>
                          {prescription.fileName}
                        </CardTitle>
                        <ShadCardDescription className="text-xs flex items-center gap-1.5 mt-1">
                          <CalendarDays className="h-3.5 w-3.5" /> Uploaded: {format(new Date(prescription.uploadDate), "MMM d, yyyy")}
                        </ShadCardDescription>
                      </CardHeader>

                      <CardContent className="p-0 space-y-3 flex-grow">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant={getStatusVariant(prescription.status)} className="text-xs">
                            Status: {getStatusText(prescription.status)}
                          </Badge>
                          {prescription.ocrConfidence && (
                            <Badge variant="outline" className="text-xs">
                              <Percent className="h-3 w-3 mr-1" /> AI Confidence: {(prescription.ocrConfidence * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        
                         {prescription.patientName && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5"><User className="h-4 w-4"/>Patient: <span className="font-medium text-foreground">{prescription.patientName}</span></p>
                         )}
                         {prescription.doctor && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Stethoscope className="h-4 w-4"/>Doctor: <span className="font-medium text-foreground">{prescription.doctor}</span></p>
                         )}


                        {prescription.extractedMedications && prescription.extractedMedications.length > 0 ? (
                          <Accordion type="single" collapsible className="w-full pt-2">
                            <AccordionItem value="medications" className="border-t border-b-0">
                              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-2">
                                {prescription.extractedMedications.length} Medication(s) Extracted
                              </AccordionTrigger>
                              <AccordionContent className="space-y-2 pt-2 pb-1 text-sm">
                                {prescription.extractedMedications.map((med, medIdx) => (
                                  <div key={medIdx} className="p-2.5 bg-background/70 rounded-md border border-input/50">
                                    <p className="font-semibold text-primary flex items-center gap-1.5"><Pill className="h-4 w-4 text-primary"/>{med.name}</p>
                                    <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1"><Thermometer className="h-3 w-3"/>Dosage: {med.dosage}</p>
                                    <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1"><Repeat className="h-3 w-3"/>Frequency: {med.frequency}</p>
                                  </div>
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : (
                          <p className="text-sm text-muted-foreground italic pt-2">No medications extracted for this item.</p>
                        )}
                      </CardContent>
                       <div className="p-0 pt-4 mt-auto"> {/* Replaced CardFooter with a div for same effect */}
                          <Link href={`/insights#${prescription.id}`} passHref legacyBehavior>
                             <Button variant="outline" size="sm" className="w-full" onClick={() => { onClose(); setPrescriptionToDelete(null); }}>
                               View Full Details in Insights Hub
                             </Button>
                          </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-border sticky bottom-0 bg-card z-10 flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto sm:ml-auto" onClick={() => { onClose(); setPrescriptionToDelete(null); }}> {/* Added sm:ml-auto */}
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    