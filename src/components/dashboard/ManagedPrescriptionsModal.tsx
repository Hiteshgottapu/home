
"use client";

import type { Prescription, MedicationDetail } from '@/types'; // Assuming Prescription type is extended or suitable
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"; // Added CardFooter
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { FileText, CalendarDays, Pill, Thermometer, Repeat, Percent, User, Stethoscope, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from 'next/link'; // Added import for Link

interface ManagedPrescriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptions: Prescription[]; // Pass prescriptions data
}

export function ManagedPrescriptionsModal({ isOpen, onClose, prescriptions }: ManagedPrescriptionsModalProps) {
  if (!prescriptions || prescriptions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg border-border">
          <DialogHeader className="p-6 border-b border-border">
            <DialogTitle className="text-2xl font-semibold text-foreground text-center">
              Managed Prescriptions
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" data-ai-hint="document icon" />
            <p className="text-muted-foreground">No prescriptions uploaded yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Upload prescriptions via the Insights Hub.</p>
          </div>
          <DialogFooter className="p-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="w-full text-base py-3 rounded-md hover:bg-muted">
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[90vw] h-[85vh] flex flex-col bg-card shadow-2xl rounded-lg border-border">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Your Managed Prescriptions
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review images and extracted details from your uploaded prescriptions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow p-6 pt-0">
          <div className="space-y-6 py-6">
            {prescriptions.map((prescription, idx) => (
              <Card key={prescription.id || idx} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:scale-[1.01]">
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
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
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
                      <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                        <CalendarDays className="h-3.5 w-3.5" /> Uploaded: {format(new Date(prescription.uploadDate), "MMM d, yyyy")}
                      </CardDescription>
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
                                  <p className="font-semibold text-primary-foreground/90 flex items-center gap-1.5"><Pill className="h-4 w-4 text-primary"/>{med.name}</p>
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
                     <CardFooter className="p-0 pt-4 mt-auto">
                        <Link href={`/insights#${prescription.id}`} passHref legacyBehavior>
                           <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
                             View Full Details in Insights Hub
                           </Button>
                        </Link>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border sticky bottom-0 bg-card z-10">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
