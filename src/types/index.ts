
export interface MedicationDetail {
  name: string;
  dosage: string;
  frequency: string;
}

export interface Prescription {
  id: string; // Firestore document ID
  fileName: string;
  uploadDate: string; // ISO string
  status: 'pending' | 'verified' | 'needs_correction' | 'analyzing' | 'error';
  extractedMedications?: MedicationDetail[];
  ocrConfidence?: number;
  doctor?: string;
  patientName?: string;
  fileUrl?: string; // URL to the uploaded file if needed for download (legacy or specific use)
  imageUrl?: string; // Firebase Storage download URL for display
  storagePath?: string; // Path in Firebase Storage for deletion
  userVerificationStatus?: 'pending' | 'verified' | 'needs_correction';
  userId?: string; // To associate with a user
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
  userId?: string; // To associate with a user
}

export interface AiFeedbackPreferences {
  symptomExplainabilityLevel: 'brief' | 'detailed';
  nudgeFrequency: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  name: string;
  email?: string;
  phoneNumber?: string;
  riskFactors?: Record<string, any>; 
  aiFeedbackPreferences: AiFeedbackPreferences;
  healthGoals: HealthGoal[]; // This will be populated from Firestore
  dateOfBirth?: string; // ISO string
  allergies?: string[];
  emergencyContact?: { name: string, phone: string };
}

export interface UpcomingAppointment {
  id: string; // Firestore document ID
  serviceId: string; // From mockServices or a future services collection
  serviceName: string;
  doctorId: string; // From mockDoctors or a future doctors collection
  doctorName: string;
  dateTime: string; // ISO string
  notes?: string;
  meetingLink: string; // Placeholder for now
  durationMinutes: number;
  userId?: string; // To associate with a user
}

export interface DoctorNote {
  id: string; // Firestore document ID
  date: string; // ISO string
  doctorName: string;
  note: string;
  appointmentId?: string; 
  tags?: string[]; 
  userId?: string; // To associate with a user
}


// For AI flow outputs, if they are directly used in components without mapping
export type { AnalyzeSymptomsOutput } from '@/ai/flows/analyze-symptoms';
export type { ExtractMedicationDetailsOutput } from '@/ai/flows/extract-medication-details';

    