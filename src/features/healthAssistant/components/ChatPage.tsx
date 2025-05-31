
"use client";
import React, { useState, useRef, useEffect, FormEvent } from "react";
import ChatMessage from "./ChatMessage"; // Changed to default import
import { EmergencyDialog } from "./EmergencyDialog";
import type { Message, AIResponse } from "../types";
import { handleUserMessage } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Mic } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";


const COMMON_SYMPTOMS = ['Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Sore Throat', 'Diarrhea'];

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState<string | undefined>(undefined);
  
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      setTimeout(() => {
        if (scrollAreaViewportRef.current) {
          scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSymptomClick = (symptom: string) => {
    setInput(prev => prev ? `${prev}, ${symptom}` : symptom);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + Math.random(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistoryForAction = messages.map(msg => ({
        id: msg.id,
        text: typeof msg.content === 'string' ? msg.content : 'Complex content', 
        sender: msg.role, // Using 'role' here but action expects 'sender'
        timestamp: msg.timestamp,
      }));


      const aiResponse: AIResponse = await handleUserMessage(conversationHistoryForAction, currentInput); 
      
      if (aiResponse.isEmergency) {
        setEmergencyMessage(aiResponse.emergencyMessage);
        setShowEmergencyDialog(true);
        const emergencySystemMessage: Message = {
            id: Date.now().toString() + Math.random(),
            content: aiResponse.emergencyMessage || "Emergency detected. Displaying critical alert.",
            role: "ai",
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, emergencySystemMessage]);

      } else if (aiResponse.text) {
        const aiMessage: Message = {
          id: Date.now().toString() + Math.random(),
          content: aiResponse.text,
          role: "ai",
          timestamp: new Date(),
          originalQuery: currentInput,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }

    } catch (error) {
      console.error("Error handling user message:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + Math.random(),
        content: "Sorry, I ran into a problem. Please try again.",
        role: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast({
        variant: "destructive",
        title: "AI Communication Error",
        description: "Could not get a response from the assistant.",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRegenerateResponse = async (messageId: string, originalQuery: string) => {
    console.log("Regenerating response for message ID:", messageId, "with query:", originalQuery);
    setMessages(prevMessages => prevMessages.map(msg => msg.id === messageId ? { ...msg, isRegenerating: true } : msg));
    setIsLoading(true);

    try {
      const historyBeforeRegen = messages.filter(msg => msg.id !== messageId && msg.timestamp < (messages.find(m=>m.id === messageId)?.timestamp || new Date()));
      
      const conversationHistoryForAction = historyBeforeRegen.map(msg => ({
        id: msg.id,
        text: typeof msg.content === 'string' ? msg.content : 'Complex content',
        sender: msg.role, // Using 'role' here
        timestamp: msg.timestamp,
      }));


      const aiResponse = await handleUserMessage(conversationHistoryForAction, originalQuery);

      if (aiResponse.isEmergency) {
        setEmergencyMessage(aiResponse.emergencyMessage);
        setShowEmergencyDialog(true);
         setMessages(prevMessages => prevMessages.map(msg => 
            msg.id === messageId 
            ? { 
                ...msg, 
                content: aiResponse.emergencyMessage || "Emergency detected.", 
                isRegenerating: false, 
                timestamp: new Date() 
              } 
            : msg));
      } else if (aiResponse.text) {
        setMessages(prevMessages => prevMessages.map(msg => 
            msg.id === messageId 
            ? { 
                ...msg, 
                content: aiResponse.text, 
                isRegenerating: false, 
                timestamp: new Date(), 
                originalQuery: originalQuery 
              } 
            : msg));
      }
    } catch (error) {
      console.error("Error regenerating response:", error);
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === messageId 
        ? { ...msg, content: "Failed to regenerate. Please try again.", isRegenerating: false, timestamp: new Date() } 
        : msg
      ));
      toast({
        variant: "destructive",
        title: "Regeneration Failed",
        description: "Could not regenerate the response.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b bg-card shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-primary">AI Health Assistant</h1>
        <p className="text-sm text-muted-foreground">Your partner in health. Not a replacement for professional medical advice.</p>
      </header>

      <div className="p-4 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground mb-1.5 px-1">Common symptoms (click to add):</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map(symptom => (
            <Button 
              key={symptom} 
              variant="outline" 
              size="sm" 
              className="rounded-full text-xs h-7 px-3 font-normal text-muted-foreground hover:text-primary hover:border-primary transition-colors duration-200 active:scale-95" 
              onClick={() => handleSymptomClick(symptom)}
              disabled={isLoading}
            >
              {symptom}
            </Button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-grow" viewportRef={scrollAreaViewportRef}>
        <div className="space-y-1 p-4 pb-24">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onRegenerate={handleRegenerateResponse} />
          ))}
          {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
            <div className="flex items-start gap-2.5 my-3 animate-fadeIn justify-start">
                <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                     <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={18} /></AvatarFallback>
                </Avatar>
                 <div className="flex flex-col items-start">
                    <div className="max-w-xs sm:max-w-sm md:max-w-md p-3 rounded-xl shadow-sm bg-card text-card-foreground border border-border rounded-bl-none">
                        <p className="text-sm italic flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          VitaLog AI is thinking...
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground/80 mt-1 ml-1">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                 </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <EmergencyDialog
        isOpen={showEmergencyDialog}
        onClose={() => setShowEmergencyDialog(false)}
        message={emergencyMessage}
      />
      
      <div className="px-4 pt-2 pb-3 border-t bg-card">
         <p className="text-xs text-muted-foreground text-center mb-2">
            VitaLog AI is for informational purposes only. Always consult with a qualified healthcare professional for medical advice.
            In case of emergency, call your local emergency number immediately.
        </p>
      </div>

      <footer className="p-4 border-t bg-card sticky bottom-0 z-10 shadow-top">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe symptoms or ask about a medicine..."
              className="flex-grow rounded-full h-11 px-4 text-sm border-input focus:border-primary focus:ring-1 focus:ring-primary/50"
              disabled={isLoading}
              aria-label="Chat input"
            />
            <Button type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary shrink-0 h-11 w-11 transition-colors duration-200 active:scale-95" disabled={isLoading || true}>
              <Mic className="h-5 w-5" />
              <span className="sr-only">Voice input (not available)</span>
            </Button>
            <Button type="submit" size="icon" className="rounded-full w-11 h-11 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 transition-colors duration-200 active:scale-95" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}

