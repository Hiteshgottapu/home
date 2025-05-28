

export interface MedicationDetail {
  name: string;
  dosage: string;
  frequency: string;
}

export interface Prescription {
  id: string;
  fileName: string;
  uploadDate: string; // ISO string
  status: 'pending' | 'verified' | 'needs_correction' | 'analyzing' | 'error';
  extractedMedications?: MedicationDetail[];
  ocrConfidence?: number;
  doctor?: string;
  patientName?: string;
  fileUrl?: string; // URL to the uploaded file if needed
  imageUrl?: string; // URL for the prescription image itself for display
  userVerificationStatus?: 'pending' | 'verified' | 'needs_correction';
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
  id: string;
  description: string;
  targetDate?: string; // ISO string
  status: 'pending' | 'in_progress' | 'completed';
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
  riskFactors?: Record<string, any>; // Example: { smoking: 'true', familyHistoryDiabetes: 'false' }
  aiFeedbackPreferences: AiFeedbackPreferences;
  healthGoals: HealthGoal[];
  // Example additional fields
  dateOfBirth?: string; // ISO string
  allergies?: string[];
  emergencyContact?: { name: string, phone: string };
}

export interface UpcomingAppointment {
  id: string;
  serviceName: string;
  doctorName: string;
  dateTime: string; // ISO string
  meetingLink: string;
  durationMinutes: number;
}


// For AI flow outputs, if they are directly used in components without mapping
export type { AnalyzeSymptomsOutput } from '@/ai/flows/analyze-symptoms';
export type { ExtractMedicationDetailsOutput } from '@/ai/flows/extract-medication-details';

