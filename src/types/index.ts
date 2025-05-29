
export interface MedicineInfo {
  overview: string;
  commonUses: string[];
  generalDosageInformation: string;
  commonPrecautions: string[];
  disclaimer: string;
}

export interface MedicationDetail {
  name: string;
  dosage: string; // May be empty if only name is extracted by new Python CF
  frequency: string; // May be empty if only name is extracted by new Python CF
  info?: MedicineInfo; // This will not be populated by the new Python CF flow
}

export interface Prescription {
  id: string; // Firestore document ID
  fileName: string;
  uploadDate: string; // ISO string
  status: 'pending' | 'verified' | 'needs_correction' | 'analyzing' | 'error';
  extractedMedications?: MedicationDetail[]; // Will contain name, dosage/freq will be initially empty from Python CF
  ocrConfidence?: number; // This field might not be available from the new Python CF.
  doctor?: string;
  patientName?: string;
  fileUrl?: string; 
  imageUrl?: string; 
  storagePath?: string; 
  userVerificationStatus?: 'pending' | 'verified' | 'needs_correction';
  userId?: string; 
}

export interface SuggestedCondition {
  condition: string;
  explanation: string;
}

export interface SymptomCheck {
  id:string;
  symptoms: string;
  date: string; // ISO string
  suggestedConditions?: SuggestedCondition[];
  aiExplainabilityNote?: string;
  userFeedback?: {
    accuracyRating: 1 | 2 | 3 | 4 | 5;
    comments: string;
  };
}

export interface HealthGoal {
  id: string; // Firestore document ID
  description: string;
  targetDate?: string; // ISO string YYYY-MM-DD
  status: 'pending' | 'in_progress' | 'completed';
  userId?: string; 
}

export interface AiFeedbackPreferences {
  symptomExplainabilityLevel: 'brief' | 'detailed';
  nudgeFrequency: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  id: string; 
  name: string;
  email?: string;
  phoneNumber?: string;
  riskFactors?: Record<string, any>; 
  aiFeedbackPreferences: AiFeedbackPreferences;
  healthGoals: HealthGoal[]; 
  dateOfBirth?: string; 
  allergies?: string[];
  emergencyContact?: { name: string, phone: string } | null; // Allow null for Firestore
}

export interface UpcomingAppointment {
  id: string; 
  serviceId: string; 
  serviceName: string;
  doctorId: string; 
  doctorName: string;
  dateTime: string; // ISO string
  notes?: string;
  meetingLink: string; 
  durationMinutes: number;
  userId?: string; 
}

export interface DoctorNote {
  id: string; 
  date: string; // ISO string
  doctorName: string;
  note: string;
  appointmentId?: string; 
  tags?: string[]; 
  userId?: string; 
}


// For AI flow outputs, if they are directly used in components without mapping
// These Genkit types are no longer directly used by PrescriptionUploadForm
// export type { AnalyzeSymptomsOutput } from '@/ai/flows/analyze-symptoms';
// export type { ExtractMedicationDetailsOutput } from '@/ai/flows/extract-medication-details';


    