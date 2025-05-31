

export interface MedicineInfo {
  overview: string;
  commonUses: string[];
  generalDosageInformation: string;
  commonPrecautions: string[];
  disclaimer: string;
}

export interface MedicationDetail {
  name: string;
  dosage: string;
  frequency: string;
  notes?: string; // Added from ScriptRecognizer flow
  info?: MedicineInfo;
  isLoadingInfo?: boolean; // For loading detailed info
  infoError?: string; // For errors fetching detailed info
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
  imageUrl?: string;
  storagePath?: string;
  userVerificationStatus?: 'pending' | 'verified' | 'needs_correction';
  userId?: string; // Added for potential direct queries if needed, though path usually has it
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
  userId?: string; // Added for potential direct queries
}

export interface AiFeedbackPreferences {
  symptomExplainabilityLevel: 'brief' | 'detailed';
  nudgeFrequency: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string | null; // Allow null for Firestore
  phoneNumber: string | null; // Allow null for Firestore
  riskFactors: Record<string, any> | null; // Allow null
  aiFeedbackPreferences: AiFeedbackPreferences;
  healthGoals: HealthGoal[];
  dateOfBirth: string | null; // Allow null
  allergies: string[] | null; // Allow null
  emergencyContact?: { name: string, phone: string } | null; // Allow null
}

export interface UpcomingAppointment {
  id: string;
  serviceId: string; // Added
  serviceName: string;
  doctorId: string; // Added
  doctorName: string;
  dateTime: string; // ISO string
  notes?: string;
  meetingLink: string;
  durationMinutes: number;
  userId?: string; // Added for potential direct queries
}

export interface DoctorNote {
  id: string;
  date: string; // ISO string
  doctorName: string;
  note: string;
  appointmentId?: string;
  tags?: string[];
  userId?: string; // Added for potential direct queries
}

export interface ScrapedMedicineResult {
  pharmacy: string;
  name: string;
  price: string;
}
