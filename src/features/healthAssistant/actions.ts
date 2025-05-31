
"use server";
// import type { Message, AIResponse } from "./types"; // Original types
import type { Message as ChatPageMessage } from "./types"; // Type from ChatPage for history
import type { AIResponse } from "./types"; // AIResponse type is fine
import { emergencyCheckFlow } from "@/ai/flows/emergencyCheckFlow";
import { generalChatFlow, GeneralChatInput } from "@/ai/flows/generalChatFlow";


// Type for history expected by generalChatFlow
interface ChatHistoryMessageForFlow {
  role: 'user' | 'model';
  parts: { text: string }[];
}


export async function handleUserMessage(
  // Use the Message type from ChatPage for incoming conversation history
  conversationHistory: { id: string; text: string; sender: "user" | "ai"; timestamp: Date; }[],
  newMessageText: string
): Promise<AIResponse> {
  console.log("HealthAssistant Action: Received new message:", newMessageText);
  console.log("HealthAssistant Action: Conversation history length:", conversationHistory.length);

  try {
    // 1. Check for emergency
    const emergencyResult = await emergencyCheckFlow({ userInput: newMessageText });
    if (emergencyResult.isEmergency) {
      console.log("HealthAssistant Action: Emergency detected by flow.");
      return {
        isEmergency: true,
        emergencyMessage: emergencyResult.message,
      };
    }

    // 2. If not an emergency, proceed with general chat
    // Map ChatPage history to the format expected by generalChatFlow
    const flowHistory: ChatHistoryMessageForFlow[] = conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }] 
    }));
    
    const generalChatInput: GeneralChatInput = {
      userQuery: newMessageText,
      history: flowHistory,
    };
    
    const chatResponse = await generalChatFlow(generalChatInput);
    
    console.log("HealthAssistant Action: General chat flow response:", chatResponse.responseText);
    return {
      text: chatResponse.responseText,
      isEmergency: false,
    };

  } catch (error) {
    console.error("Error in HealthAssistant action (handleUserMessage):", error);
    return {
      text: "I'm sorry, I encountered an error while processing your request. Please try again later.",
      isEmergency: false,
    };
  }
}
