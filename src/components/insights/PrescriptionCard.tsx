
"use client";

import type { Prescription } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CalendarDays, AlertTriangle, CheckCircle, Eye, Edit3, Info, Loader2, ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface PrescriptionCardProps {
  prescription: Prescription;
  onViewDetails: (prescription: Prescription) => void;
  onVerify: (prescription: Prescription) => void;
}

export function PrescriptionCard({ prescription, onViewDetails, onVerify }: PrescriptionCardProps) {
  
  const getStatusInfo = (status: Prescription['status']) => {
    switch (status) {
      case 'verified': 
        return { text: 'Verified', variant: 'default' as const, Icon: CheckCircle, iconColor: 'text-green-600' };
      case 'needs_correction': 
        return { text: 'Needs Correction', variant: 'destructive' as const, Icon: AlertTriangle, iconColor: 'text-destructive-foreground' };
      case 'pending': 
        return { text: 'Pending Review', variant: 'secondary' as const, Icon: Info, iconColor: 'text-blue-600' };
      case 'analyzing': 
        return { text: 'Analyzing...', variant: 'outline' as const, Icon: Loader2, iconColor: 'text-amber-600 animate-spin' };
      case 'error': 
        return { text: 'Analysis Error', variant: 'destructive' as const, Icon: AlertTriangle, iconColor: 'text-destructive-foreground' };
      default: 
        return { text: 'Unknown', variant: 'secondary' as const, Icon: ShieldQuestion, iconColor: 'text-muted-foreground' };
    }
  };

  const statusInfo = getStatusInfo(prescription.status);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 w-full transform hover:-translate-y-1 active:shadow-md active:translate-y-0">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 truncate">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate" title={prescription.fileName}>{prescription.fileName}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs mt-1">
              <CalendarDays className="h-3 w-3" /> Uploaded on {format(new Date(prescription.uploadDate), "MMM d, yyyy")}
            </CardDescription>
          </div>
          <Badge variant={statusInfo.variant} className="capitalize flex items-center gap-1.5 shrink-0 px-2 py-1 text-xs">
            <statusInfo.Icon className={`h-3.5 w-3.5 ${statusInfo.iconColor}`} />
            {statusInfo.text}
          </Badge>
        </div>
      </CardHeader>
      {(prescription.extractedMedications && prescription.extractedMedications.length > 0) || prescription.ocrConfidence ? (
        <CardContent className="py-2">
          {prescription.extractedMedications && prescription.extractedMedications.length > 0 && (
            <>
              <p className="text-sm font-medium mb-1 text-foreground">Extracted Medications:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto">
                {prescription.extractedMedications.slice(0, 2).map((med, index) => (
                  <li key={index} className="truncate" title={`${med.name} - ${med.dosage}`}>
                    {med.name} <span className="text-xs">({med.dosage || 'N/A'})</span>
                  </li>
                ))}
                {prescription.extractedMedications.length > 2 && <li className="text-xs">...and {prescription.extractedMedications.length - 2} more</li>}
              </ul>
            </>
          )}
           {prescription.ocrConfidence && (
            <p className={`text-xs mt-2 ${prescription.extractedMedications && prescription.extractedMedications.length > 0 ? 'pt-2 border-t border-dashed' : ''}`}>
              AI Confidence: <span className={`font-semibold ${prescription.ocrConfidence > 0.7 ? "text-green-600" : prescription.ocrConfidence > 0.4 ? "text-amber-600" : "text-red-600"}`}>
                {(prescription.ocrConfidence * 100).toFixed(0)}%
              </span>
            </p>
          )}
        </CardContent>
      ): (
        <CardContent className="py-2">
            <p className="text-sm text-muted-foreground italic">
                {prescription.status === 'analyzing' ? 'Awaiting analysis results...' : 'No medication data available yet.'}
            </p>
        </CardContent>
      )}
      <CardFooter className="flex justify-end gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(prescription)} className="transition-all duration-200 active:scale-95">
          <Eye className="mr-1.5 h-4 w-4" /> View Details
        </Button>
        {(prescription.status === 'needs_correction' || prescription.status === 'pending' || prescription.status === 'error') && (
          <Button variant="default" size="sm" onClick={() => onVerify(prescription)} className="transition-all duration-200 active:scale-95">
            <Edit3 className="mr-1.5 h-4 w-4" /> 
            {prescription.status === 'error' ? 'Retry & Edit' : 'Verify & Edit'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
