
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle, CardDescription as CardSubDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MessageSquare, Stethoscope, ClipboardEdit, CalendarDays, UserCircle, MessageSquareWarning } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "../ui/badge";
import type { DoctorNote } from '@/types'; // Import DoctorNote type

export interface MockAiChatEntry { // Kept for mock data, real AI chats would need a type and Firestore integration
  id: string;
  timestamp: string; // ISO string
  userQuery: string;
  aiResponse: string;
}

interface InteractionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiChatLogs: MockAiChatEntry[]; // AI chats remain mock for now
  doctorNotes: DoctorNote[]; // Doctor notes come from Firestore
}

export function InteractionLogModal({ isOpen, onClose, aiChatLogs, doctorNotes }: InteractionLogModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] md:w-[70vw] h-[85vh] md:h-[75vh] flex flex-col bg-card shadow-2xl rounded-lg border-border">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <MessageSquareWarning className="h-7 w-7 text-primary" />
            Interaction & Feedback Log
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review important AI assistant conversations and doctor's notes.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="doctor-notes" className="flex-grow flex flex-col overflow-hidden p-0">
          <TabsList className="mx-6 mt-4 mb-2 sticky top-0 bg-card z-5 border-b rounded-none justify-start">
            <TabsTrigger value="doctor-notes" className="text-sm">Doctor's Notes</TabsTrigger>
            <TabsTrigger value="ai-chats" className="text-sm">AI Assistant Log (Mock)</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-grow px-6 py-4">
            <TabsContent value="doctor-notes" className="mt-0 space-y-4">
              {doctorNotes.length > 0 ? (
                doctorNotes.map(note => (
                  <Card key={note.id} className="shadow-md hover:shadow-lg transition-shadow duration-300 bg-background/50">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <ShadCardTitle className="text-base font-semibold text-primary flex items-center gap-2">
                        <Stethoscope size={20} className="text-primary"/> Note from {note.doctorName}
                      </ShadCardTitle>
                      <CardSubDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                         <CalendarDays size={14}/> {format(new Date(note.date), "MMM d, yyyy")}
                         {note.appointmentId && <span className="text-primary/80 ml-2">(Appt ID: {note.appointmentId})</span>}
                      </CardSubDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{note.note}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {note.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                  <ClipboardEdit size={48} className="mx-auto mb-3 opacity-50" />
                   <p className="text-lg">No doctor's notes available yet.</p>
                  <p className="text-sm">Notes from your doctor will appear here after appointments.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="ai-chats" className="mt-0 space-y-4">
              {aiChatLogs.length > 0 ? (
                aiChatLogs.map(log => (
                  <Card key={log.id} className="shadow-md hover:shadow-lg transition-shadow duration-300 bg-background/50">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CalendarDays size={14}/> {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="p-3 bg-muted/60 rounded-md border border-input/70 shadow-sm">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2"><UserCircle size={18} className="text-primary"/> Your Query:</p>
                        <p className="text-sm text-foreground/90 pl-1 mt-1">{log.userQuery}</p>
                      </div>
                      <div className="p-3 bg-accent/15 rounded-md border border-accent/40 shadow-sm">
                        <p className="text-sm font-medium text-accent flex items-center gap-2"><Bot size={18} className="text-accent"/> VitaLog AI:</p>
                        <p className="text-sm text-foreground/90 pl-1 mt-1">{log.aiResponse}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                  <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No AI assistant interactions logged yet.</p>
                  <p className="text-sm">Start a conversation with the AI assistant to see logs here.</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

    