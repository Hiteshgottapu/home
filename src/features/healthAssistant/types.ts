
// This Message type is primarily for the ChatPage component's internal state
// It has slightly different fields (role, content) than what the action might expect for history
export interface Message {
  id: string;
  role: "user" | "ai"; // Changed from sender
  content: React.ReactNode; // Changed from text, to support complex React elements
  timestamp: Date;
  originalQuery?: string; // For regeneration context
  isRegenerating?: boolean; // To show loading state on specific message
  // Optional fields for structured data display within the message component
  symptomData?: any; // Replace 'any' with specific ExplainSymptomsOutput type if available
  medicineData?: any; // Replace 'any' with specific MedicineDetailsOutput type if available
}


// This is for the AI's response from the backend action
export interface AIResponse {
  text?: string;
  isEmergency?: boolean;
  emergencyMessage?: string;
  followUpQuestions?: string[];
  // Add other potential structured responses here
  // e.g., medicineData, symptomReportData
}
