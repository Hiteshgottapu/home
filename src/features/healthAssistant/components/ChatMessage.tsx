
"use client";
import type { Message } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg my-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-primary/20">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] p-3 rounded-xl shadow-md",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none border border-border"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        {/* Here you could add more rendering based on message.type */}
        {/* For example, if message.type === 'medicine_info_card', render a MedicineInfoCard */}
      </div>
      {isUser && (
         <Avatar className="h-8 w-8 border border-muted-foreground/20">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
