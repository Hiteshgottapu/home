
"use client";

import { useState, useEffect } from 'react';
import { PrescriptionUploadForm } from '@/components/insights/PrescriptionUploadForm';
import { PrescriptionCard } from '@/components/insights/PrescriptionCard';
import { PrescriptionDetailModal } from '@/components/insights/PrescriptionDetailModal';
import type { Prescription } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, FileSearch, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card'; // Ensured import

// Mock initial prescriptions
const initialPrescriptions: Prescription[] = [
  {
    id: 'pres_1',
    fileName: 'DrSmith_Rx_Amoxicillin.pdf',
    uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'verified',
    extractedMedications: [{ name: 'Amoxicillin', dosage: '250mg', frequency: 'Thrice daily' }],
    ocrConfidence: 0.92,
    doctor: "Dr. Smith",
    patientName: "Alex Ryder",
    userVerificationStatus: 'verified',
  },
  {
    id: 'pres_2',
    fileName: 'CardioClinic_Atorvastatin.jpg',
    uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    status: 'needs_correction',
    extractedMedications: [{ name: 'Atorvasttin', dosage: '20mg', frequency: 'Once daily' }, { name: 'Asprin', dosage: '81mg', frequency: 'Once daily'}],
    ocrConfidence: 0.65,
    doctor: "Cardio Clinic",
    patientName: "Alex Ryder",
    userVerificationStatus: 'pending',
  },
];


export default function InsightsHubPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');


  const handleUploadSuccess = (newPrescription: Prescription) => {
    setPrescriptions(prev => [newPrescription, ...prev]);
  };

  const handleViewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };
  
  const handleVerify = (prescription: Prescription) => {
    // This could open the same modal, perhaps pre-scrolled to an edit section
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const handleSaveVerification = (updatedPrescription: Prescription) => {
    setPrescriptions(prev => prev.map(p => p.id === updatedPrescription.id ? updatedPrescription : p));
    setIsModalOpen(false); // Close modal after saving
  };

  const filteredPrescriptions = prescriptions
    .filter(p => p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 p.extractedMedications?.some(med => med.name.toLowerCase().includes(searchTerm.toLowerCase())))
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());


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
            <Button variant={viewMode === 'list' ? "default" : "outline"} size="icon" onClick={() => setViewMode('list')} aria-label="List view">
              <List className="h-4 w-4"/>
            </Button>
            <Button variant={viewMode === 'grid' ? "default" : "outline"} size="icon" onClick={() => setViewMode('grid')} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4"/>
            </Button>
          </div>
        </div>

        {filteredPrescriptions.length > 0 ? (
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
              {searchTerm || filterStatus !== 'all' ? "Try adjusting your search or filter criteria." : "Upload your first prescription to get started."}
            </p>
            {!(searchTerm || filterStatus !== 'all') && 
                <Button onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Upload Now
                </Button>
            }
          </div>
        )}
      </section>
      
      {/* Placeholder for Comprehensive Health Report View */}
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
