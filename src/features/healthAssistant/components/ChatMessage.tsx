
"use client";
import type { Message } from "../types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div className={cn("flex items-start gap-2.5 my-3 animate-fadeIn", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col w-full max-w-xs sm:max-w-sm md:max-w-md", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "p-3 rounded-xl shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-card text-card-foreground border border-border rounded-bl-none"
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className="mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'p')}
          </span>
          {/* Placeholder for feedback icons on AI messages - functionality not yet implemented */}
          {!isUser && message.type !== "emergency_alert" && (
            <span className="ml-2 space-x-1.5 hidden"> {/* Hidden for now as per screenshot */}
              {/* 
              <ThumbsUp className="inline h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-pointer" />
              <ThumbsDown className="inline h-3.5 w-3.5 text-muted-foreground hover:text-destructive cursor-pointer" />
              <Volume2 className="inline h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-pointer" /> 
              */}
            </span>
          )}
        </div>
      </div>
      {isUser && (
         <Avatar className="h-8 w-8 border border-muted-foreground/20 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
