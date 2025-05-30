
export interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  type?: "text" | "emergency_alert" | "medicine_info_card" | "symptom_report_card"; // For rendering different UIs
  data?: any; // For structured data associated with the message type
}

export interface AIResponse {
  text?: string;
  isEmergency?: boolean;
  emergencyMessage?: string;
  followUpQuestions?: string[];
  // Add other potential structured responses here
  // e.g., medicineData, symptomReportData
}
