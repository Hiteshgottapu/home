
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as CardSubDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MessageSquare, Stethoscope, ClipboardEdit, CalendarDays, UserCircle, MessageSquareWarning } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "../ui/badge";

export interface MockAiChatEntry {
  id: string;
  timestamp: string; // ISO string
  userQuery: string;
  aiResponse: string;
}

export interface MockDoctorNoteEntry {
  id: string;
  date: string; // ISO string
  doctorName: string;
  note: string;
  appointmentId?: string; // Optional link to an appointment
  tags?: string[]; // Optional tags like "Follow-up", "Medication Change"
}

interface InteractionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiChatLogs: MockAiChatEntry[];
  doctorNotes: MockDoctorNoteEntry[];
}

export function InteractionLogModal({ isOpen, onClose, aiChatLogs, doctorNotes }: InteractionLogModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] md:w-[70vw] h-[85vh] md:h-[75vh] flex flex-col bg-card shadow-2xl rounded-lg border-border">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <MessageSquareWarning className="h-7 w-7 text-primary" /> {/* Using existing icon for consistency */}
            Interaction & Feedback Log
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review important AI assistant conversations and doctor's notes.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai-chats" className="flex-grow flex flex-col overflow-hidden p-0">
          <TabsList className="mx-6 mt-2 mb-0 sticky top-[calc(theme(spacing.24)_+_1px)] bg-card z-5 border-b rounded-none justify-start"> {/* Adjusted margin */}
            <TabsTrigger value="ai-chats" className="text-sm">AI Assistant Log</TabsTrigger>
            <TabsTrigger value="doctor-notes" className="text-sm">Doctor's Notes</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-grow px-6 py-4">
            <TabsContent value="ai-chats" className="mt-0 space-y-4">
              {aiChatLogs.length > 0 ? (
                aiChatLogs.map(log => (
                  <Card key={log.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CalendarDays size={14}/> {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="p-3 bg-muted/30 rounded-md border border-input/50">
                        <p className="text-sm font-medium text-primary flex items-center gap-2"><UserCircle size={16} /> Your Query:</p>
                        <p className="text-sm text-foreground pl-1">{log.userQuery}</p>
                      </div>
                      <div className="p-3 bg-accent/10 rounded-md border border-accent/30">
                        <p className="text-sm font-medium text-accent flex items-center gap-2"><Bot size={16} /> VitaLog AI:</p>
                        <p className="text-sm text-foreground pl-1">{log.aiResponse}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                  No AI assistant interactions logged yet.
                </div>
              )}
            </TabsContent>

            <TabsContent value="doctor-notes" className="mt-0 space-y-4">
              {doctorNotes.length > 0 ? (
                doctorNotes.map(note => (
                  <Card key={note.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-base font-semibold text-primary flex items-center gap-2">
                        <Stethoscope size={18}/> Note from {note.doctorName}
                      </CardTitle>
                      <CardSubDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                         <CalendarDays size={14}/> {format(new Date(note.date), "MMM d, yyyy")}
                         {note.appointmentId && <span className="text-primary/80">(Appt: {note.appointmentId})</span>}
                      </CardSubDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.note}</p>
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
                <div className="text-center py-10 text-muted-foreground">
                  <ClipboardEdit size={48} className="mx-auto mb-2 opacity-50" />
                  No doctor's notes available yet.
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        {/* DialogFooter can be added here if a global close button is desired */}
      </DialogContent>
    </Dialog>
  );
}
