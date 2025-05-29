
"use client";

import type { Prescription, MedicationDetail } from '@/types'; // MedicineInfo is implicitly available
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadCardDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { FileText, CalendarDays, Pill, Thermometer, Repeat, Percent, User, Stethoscope, Trash2, AlertTriangle, Loader2, Info, ListChecks, ShieldAlert, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from 'next/link';
import { useState } from 'react'; // Removed useEffect as it's not managing local state for prescriptions anymore
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
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

interface ManagedPrescriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptions: Prescription[]; 
}

export function ManagedPrescriptionsModal({ isOpen, onClose, prescriptions }: ManagedPrescriptionsModalProps) {
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  const handleDeleteClick = (prescription: Prescription) => {
    setPrescriptionToDelete(prescription);
  };

  const confirmDelete = async () => {
    if (!prescriptionToDelete || !firebaseUser || !db || !storage) {
        toast({ title: "Error", description: "Cannot delete prescription. Missing user or DB/Storage instance.", variant: "destructive" });
        setPrescriptionToDelete(null);
        return;
    }
    setIsDeleting(true);
    try {
        const presDocRef = doc(db, `users/${firebaseUser.uid}/prescriptions`, prescriptionToDelete.id);
        await deleteDoc(presDocRef);

        if (prescriptionToDelete.storagePath) {
            const imageRef = ref(storage, prescriptionToDelete.storagePath);
            await deleteObject(imageRef);
        }
        
        toast({
            title: "Prescription Deleted",
            description: `"${prescriptionToDelete.fileName}" has been removed.`,
            variant: "default" 
        });
        // List updates via onSnapshot in DashboardPage
    } catch (error) {
        console.error("Error deleting prescription:", error);
        toast({ title: "Deletion Failed", description: "Could not delete the prescription. Please try again.", variant: "destructive"});
    } finally {
        setIsDeleting(false);
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
  
  if (!isOpen) { 
      return null; 
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setPrescriptionToDelete(null); } }}>
      <DialogContent className="max-w-4xl w-[95vw] md:w-[80vw] h-[80vh] md:h-[75vh] flex flex-col bg-card shadow-2xl rounded-lg border-border p-0">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Your Managed Prescriptions
          </DialogTitle>
          <ShadCardDescription className="text-muted-foreground">
            Review images and AI-analyzed details from your uploaded prescriptions.
          </ShadCardDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-2">
          {prescriptions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-ai-hint="document icon" />
                <p className="text-lg font-medium text-foreground">No Prescriptions Yet</p>
                <p className="text-muted-foreground">Looks like you haven't uploaded any prescriptions.</p>
                <p className="text-sm text-muted-foreground mt-1">Upload new prescriptions via the Insights Hub.</p>
                <Button variant="link" asChild className="mt-4 text-primary" onClick={() => { onClose(); setPrescriptionToDelete(null); }}>
                    <Link href="/insights#upload">Go to Insights Hub</Link>
                </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.01] group relative border">
                  <AlertDialog open={!!prescriptionToDelete && prescriptionToDelete.id === prescription.id} onOpenChange={(open) => !open && setPrescriptionToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteClick(prescription)} 
                        className="absolute top-3 right-3 z-20 h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Delete prescription"
                        disabled={isDeleting && prescriptionToDelete?.id === prescription.id}
                      >
                        {isDeleting && prescriptionToDelete?.id === prescription.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                      </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the prescription for "{prescriptionToDelete?.fileName}"? This will remove the image and all associated data. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPrescriptionToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <div className="grid md:grid-cols-12 gap-0">
                    <div className="md:col-span-4 bg-muted/30 p-3 flex items-center justify-center relative aspect-square md:aspect-auto">
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
                          <FileText className="h-20 w-20 opacity-50" />
                          <span>No Image</span>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-8 p-5 flex flex-col">
                      <CardHeader className="p-0 pb-3">
                        <ShadCardTitle className="text-lg text-primary truncate" title={prescription.fileName}>
                          {prescription.fileName}
                        </ShadCardTitle>
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
                          <Accordion type="multiple" className="w-full pt-2">
                            {prescription.extractedMedications.map((med, medIdx) => (
                              <AccordionItem value={`med-${medIdx}`} key={medIdx} className="border rounded-md mb-2 bg-background/50 last:mb-0">
                                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-2.5 px-3 hover:bg-muted/30">
                                  <div className="flex items-center gap-2">
                                    <Pill className="h-4 w-4 text-primary"/> {med.name}
                                    <span className="text-xs text-muted-foreground">({med.dosage}, {med.frequency})</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2 pt-2 pb-3 px-3 text-xs border-t">
                                  {med.info ? (
                                    <>
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
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground italic">No detailed information available for this medication.</p>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <p className="text-sm text-muted-foreground italic pt-2">No medications extracted for this item.</p>
                        )}
                      </CardContent>
                       <div className="p-0 pt-4 mt-auto">
                          <Link href={`/insights#${prescription.id}`} passHref legacyBehavior>
                             <Button variant="outline" size="sm" className="w-full" onClick={() => { onClose(); setPrescriptionToDelete(null); }}>
                               View & Verify Full Details in Insights Hub
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
      </DialogContent>
    </Dialog>
  );
}
