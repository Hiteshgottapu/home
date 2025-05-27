"use client";

import type { Prescription } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CalendarDays, AlertTriangle, CheckCircle, Eye, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface PrescriptionCardProps {
  prescription: Prescription;
  onViewDetails: (prescription: Prescription) => void;
  onVerify: (prescription: Prescription) => void; // Or just ID
}

export function PrescriptionCard({ prescription, onViewDetails, onVerify }: PrescriptionCardProps) {
  const getStatusVariant = (status: Prescription['status']) => {
    switch (status) {
      case 'verified': return 'default'; // default is primary in Badge
      case 'needs_correction': return 'destructive';
      case 'pending': return 'secondary';
      case 'analyzing': return 'outline'; // A bit more neutral
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };
   const getStatusText = (status: Prescription['status']) => {
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
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {prescription.fileName}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs mt-1">
              <CalendarDays className="h-3 w-3" /> Uploaded on {format(new Date(prescription.uploadDate), "MMM d, yyyy")}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(prescription.status)} className="capitalize">
            {prescription.status === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
            {prescription.status === 'needs_correction' && <AlertTriangle className="mr-1 h-3 w-3" />}
            {getStatusText(prescription.status)}
          </Badge>
        </div>
      </CardHeader>
      {prescription.extractedMedications && prescription.extractedMedications.length > 0 && (
        <CardContent className="py-2">
          <p className="text-sm font-medium mb-1 text-foreground">Extracted Medications:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto">
            {prescription.extractedMedications.slice(0, 2).map((med, index) => (
              <li key={index} className="truncate">{med.name} - {med.dosage}</li>
            ))}
            {prescription.extractedMedications.length > 2 && <li className="text-xs">...and {prescription.extractedMedications.length - 2} more</li>}
          </ul>
           {prescription.ocrConfidence && (
            <p className="text-xs text-muted-foreground mt-2">
              AI Confidence: <span className={prescription.ocrConfidence > 0.7 ? "text-green-600" : "text-amber-600"}>{(prescription.ocrConfidence * 100).toFixed(0)}%</span>
            </p>
          )}
        </CardContent>
      )}
      <CardFooter className="flex justify-end gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(prescription)}>
          <Eye className="mr-1.5 h-4 w-4" /> View Details
        </Button>
        {(prescription.status === 'needs_correction' || prescription.status === 'pending') && (
          <Button variant="default" size="sm" onClick={() => onVerify(prescription)}>
            <Edit3 className="mr-1.5 h-4 w-4" /> Verify & Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
