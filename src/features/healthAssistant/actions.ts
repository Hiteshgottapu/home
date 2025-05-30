
"use server";
import type { Message, AIResponse } from "./types";
import { emergencyCheckFlow } from "@/ai/flows/emergencyCheckFlow";
import { generalChatFlow } from "@/ai/flows/generalChatFlow";
// Import other specific AI flows here as they are developed

export async function handleUserMessage(
  conversationHistory: Message[],
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

    // 2. If not an emergency, proceed with general chat or more sophisticated routing
    // For now, we'll use a general chat flow.
    // In a more advanced setup, you might call a router flow here.
    const generalChatInput = {
      userQuery: newMessageText,
      history: conversationHistory.map(msg => ({role: msg.sender === 'user' ? 'user' : 'model', parts: [{text: msg.text}]})),
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
