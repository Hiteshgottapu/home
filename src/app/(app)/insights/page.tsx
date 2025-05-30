
"use client";

import { useState, useEffect, useCallback } from 'react';
import { PrescriptionUploadForm } from '@/components/insights/PrescriptionUploadForm';
import { PrescriptionCard } from '@/components/insights/PrescriptionCard';
import { PrescriptionDetailModal } from '@/components/insights/PrescriptionDetailModal';
import type { Prescription } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, FileSearch, LayoutGrid, List, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'; // Added CardHeader and CardFooter
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Unsubscribe, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsightsHubPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  const { firebaseUser, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!firebaseUser || !db) {
        if (!authIsLoading) setIsLoading(false);
        return;
    }
    setIsLoading(true);
    console.log("InsightsHubPage: Setting up Firestore listener for prescriptions for user:", firebaseUser.uid);
    const prescriptionsQuery = query(collection(db, `users/${firebaseUser.uid}/prescriptions`), orderBy("uploadDate", "desc"));
    const unsubscribe = onSnapshot(prescriptionsQuery, (snapshot) => {
        const scripts: Prescription[] = [];
        snapshot.forEach(doc => scripts.push({ id: doc.id, ...doc.data() } as Prescription));
        setPrescriptions(scripts);
        setIsLoading(false);
        console.log("InsightsHubPage: Prescriptions updated via snapshot. Count:", scripts.length);
    }, (error) => {
        console.error("InsightsHubPage: Error fetching prescriptions:", error);
        toast({ title: "Error Fetching Prescriptions", description: "Could not fetch prescriptions. Please try refreshing.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => {
      console.log("InsightsHubPage: Unsubscribing from prescriptions listener.");
      unsubscribe();
    };
  }, [firebaseUser, authIsLoading, toast]);

  const handleUploadSuccess = (newPrescription: Prescription) => {
    // Firestore onSnapshot will update the list, so no need to manually add here.
    toast({ title: "Upload & Analysis Started", description: `${newPrescription.fileName} is being processed. Details will appear soon.`});
  };

  const handleViewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const handleVerify = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const handleSaveVerification = async (updatedPrescription: Prescription) => {
    if (!firebaseUser || !db) {
        toast({ title: "Error", description: "Cannot save verification. User not authenticated.", variant: "destructive" });
        return;
    }
    try {
        const presDocRef = doc(db, `users/${firebaseUser.uid}/prescriptions`, updatedPrescription.id);
        const { id, userId, ...dataToUpdate } = {
          ...updatedPrescription,
          status: 'verified' as Prescription['status'], 
          userVerificationStatus: 'verified' as Prescription['userVerificationStatus'],
        };
        await updateDoc(presDocRef, dataToUpdate);
        toast({ title: "Verification Saved", description: "Your changes have been saved successfully." });
    } catch (error) {
        console.error("Error saving verification:", error);
        toast({ title: "Save Failed", description: "Could not save your verification.", variant: "destructive"});
    }
    setIsModalOpen(false);
  };

  const filteredPrescriptions = prescriptions
    .filter(p => p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (p.extractedMedications || []).some(med => med.name.toLowerCase().includes(searchTerm.toLowerCase())))
    .filter(p => filterStatus === 'all' || p.status === filterStatus);


  const renderSkeletonCards = (count: number) => (
    Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="shadow-md w-full">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-5/6" />
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </CardFooter>
      </Card>
    ))
  );

  if (authIsLoading) { 
    return (
      <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
        <Skeleton className="h-10 w-1/3 mb-1" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg mb-8" /> {/* For PrescriptionUploadForm */}
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <Skeleton className="h-8 w-1/4" />
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {renderSkeletonCards(viewMode === 'grid' ? 3 : 2)}
        </div>
      </div>
    );
  }
  
  if (!firebaseUser && !authIsLoading) { 
    return <div className="text-center py-10">Please log in to view your insights.</div>;
  }


  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Insights Hub</h1>
        <p className="text-muted-foreground">Manage your prescriptions and view health reports.</p>
      </div>

      <PrescriptionUploadForm onUploadSuccess={handleUploadSuccess} />

      <section>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-foreground">Your Prescriptions</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              placeholder="Search prescriptions..."
              className="max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="needs_correction">Needs Correction</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="analyzing">Analyzing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={viewMode === 'list' ? "default" : "outline"} size="icon" onClick={() => setViewMode('list')} aria-label="List view" className="transition-all duration-200 active:scale-95">
              <List className="h-4 w-4"/>
            </Button>
            <Button variant={viewMode === 'grid' ? "default" : "outline"} size="icon" onClick={() => setViewMode('grid')} aria-label="Grid view" className="transition-all duration-200 active:scale-95">
              <LayoutGrid className="h-4 w-4"/>
            </Button>
          </div>
        </div>

        {isLoading && firebaseUser ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {renderSkeletonCards(viewMode === 'grid' ? 3 : 2)}
          </div>
        ) : filteredPrescriptions.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredPrescriptions.map(p => (
              <PrescriptionCard
                key={p.id}
                prescription={p}
                onViewDetails={handleViewDetails}
                onVerify={handleVerify}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg bg-card">
            <FileSearch data-ai-hint="magnifying glass document" className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Prescriptions Found</h3>
            <p className="text-muted-foreground mb-4">
              {prescriptions.length === 0 && !searchTerm && filterStatus === 'all' 
                ? "Upload your first prescription to get started." 
                : "Try adjusting your search or filter criteria, or clear them to see all prescriptions."}
            </p>
            {prescriptions.length === 0 && !searchTerm && filterStatus === 'all' &&
                <Button onClick={() => {
                  const uploadSection = document.getElementById('upload');
                  if (uploadSection) {
                    uploadSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }} className="transition-all duration-300 active:scale-95">
                    <PlusCircle className="mr-2 h-4 w-4" /> Upload Now
                </Button>
            }
          </div>
        )}
      </section>

      <section className="mt-12">
         <h2 className="text-2xl font-semibold mb-4 text-foreground">Comprehensive Health Reports</h2>
          <Card className="shadow-md">
            <CardContent className="p-6 text-center">
                <Image src="https://placehold.co/600x300.png?text=Health+Report+Chart" alt="Health Report Placeholder" width={600} height={300} className="mx-auto rounded-md mb-4" data-ai-hint="health report chart" />
                <p className="text-muted-foreground mb-4">Your comprehensive health reports will be available here, generated from your verified data. Feature coming soon.</p>
                <Button variant="outline" disabled>Download Report (PDF) - Coming Soon</Button>
            </CardContent>
          </Card>
      </section>

      <PrescriptionDetailModal
        prescription={selectedPrescription}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveVerification={handleSaveVerification}
      />
    </div>
  );
}

