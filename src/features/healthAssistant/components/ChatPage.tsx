
"use client";
import React, { useState, useRef, useEffect, FormEvent } from "react";
import { ChatMessage } from "./ChatMessage";
import { EmergencyDialog } from "./EmergencyDialog";
import type { Message, AIResponse } from "../types";
import { handleUserMessage } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState<string | undefined>(undefined);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + Math.random(),
      text: input.trim(),
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponse: AIResponse = await handleUserMessage([...messages, userMessage], userMessage.text);
      
      if (aiResponse.isEmergency) {
        setEmergencyMessage(aiResponse.emergencyMessage);
        setShowEmergencyDialog(true);
        // Optionally add a system message about emergency detection
        const emergencySystemMessage: Message = {
            id: Date.now().toString() + Math.random(),
            text: aiResponse.emergencyMessage || "Emergency detected. Displaying critical alert.",
            sender: "ai",
            timestamp: new Date(),
            type: "emergency_alert"
        };
        setMessages(prev => [...prev, emergencySystemMessage]);

      } else if (aiResponse.text) {
        const aiMessage: Message = {
          id: Date.now().toString() + Math.random(),
          text: aiResponse.text,
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
      // Handle other types of AI responses here (e.g., medicine cards, symptom reports)
      // if (aiResponse.medicineData) { ... }

    } catch (error) {
      console.error("Error handling user message:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + Math.random(),
        text: "Sorry, I ran into a problem. Please try again.",
        sender: "ai",
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

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b bg-card shadow-sm">
        <h1 className="text-xl font-semibold text-primary">AI Health Assistant</h1>
        <p className="text-sm text-muted-foreground">Your partner in health. Not a replacement for professional medical advice.</p>
      </header>
      
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-2 mb-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && messages.length > 0 && messages[messages.length-1].sender === 'user' && (
            <div className="flex items-start gap-3 p-3 justify-start">
                 <Loader2 className="h-8 w-8 text-primary animate-spin" />
                 <div className="max-w-[70%] p-3 rounded-xl shadow-md bg-card text-card-foreground rounded-bl-none border border-border">
                    <p className="text-sm italic">Thinking...</p>
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

      <footer className="p-4 border-t bg-card">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your health query..."
            className="flex-grow text-base"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="w-10 h-10">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
         <p className="text-xs text-muted-foreground mt-2 text-center">
            VitaLog AI is for informational purposes only. Always consult with a qualified healthcare professional for medical advice.
            In case of emergency, call your local emergency number immediately.
        </p>
      </footer>
    </div>
  );
}
