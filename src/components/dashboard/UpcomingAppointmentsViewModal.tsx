
"use client";

import type { UpcomingAppointment } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarCheck, BriefcaseMedical, User, Clock, Video, PlusCircle, ArrowRight, MapPin, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface UpcomingAppointmentsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: UpcomingAppointment[];
  onOpenBookingModal: () => void;
}

export function UpcomingAppointmentsViewModal({ isOpen, onClose, appointments, onOpenBookingModal }: UpcomingAppointmentsViewModalProps) {
  if (!isOpen) return null;

  const handleJoinMeeting = (link: string) => {
    if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
        window.open(link, '_blank', 'noopener,noreferrer');
    } else {
        console.warn("Invalid or missing meeting link:", link);
        // Optionally, show a toast to the user
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] md:w-[70vw] h-[85vh] md:h-[75vh] flex flex-col bg-card shadow-2xl rounded-lg border-border p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2.5">
            <CalendarCheck className="h-7 w-7 text-primary" />
            Your Upcoming Appointments
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review your scheduled consultations or book a new one.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-4">
          {appointments.length > 0 ? (
            <div className="space-y-5">
              {appointments.map(appt => (
                <Card 
                  key={appt.id} 
                  className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] bg-background/70 border-border overflow-hidden group"
                >
                  <CardHeader className="p-4 pb-3 bg-muted/30 border-b border-border group-hover:bg-muted/50 transition-colors duration-300">
                    <ShadCardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                      <BriefcaseMedical size={20} /> {appt.serviceName}
                    </ShadCardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                      <User size={16} /> With: {appt.doctorName}
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start text-sm text-foreground">
                      <Clock size={18} className="mr-2.5 text-accent flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">{format(parseISO(appt.dateTime), 'EEEE, MMMM d, yyyy')}</span>
                        <span className="text-lg font-semibold">{format(parseISO(appt.dateTime), 'h:mm a')} ({appt.durationMinutes} min)</span>
                      </div>
                    </div>
                     {appt.notes && (
                        <div className="flex items-start text-sm text-muted-foreground">
                            <FileText size={16} className="mr-2.5 text-muted-foreground/80 flex-shrink-0 mt-0.5" />
                            <p className="italic">Your note: "{appt.notes}"</p>
                        </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin size={16} className="mr-2.5 text-muted-foreground/80 flex-shrink-0" />
                       <span>Virtual Consultation</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-3 bg-muted/20 border-t border-border group-hover:bg-muted/40 transition-colors duration-300">
                    <Button 
                      onClick={() => handleJoinMeeting(appt.meetingLink)} 
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out py-3.5 text-base"
                    >
                      <Video size={20} className="mr-2.5" /> Join Meeting
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center h-full">
              <CalendarCheck size={64} className="mx-auto mb-6 opacity-40" data-ai-hint="calendar icon" />
              <p className="text-xl font-medium text-foreground mb-2">No Upcoming Appointments</p>
              <p className="text-base mb-6">It looks like your schedule is clear. Time to book your next check-up?</p>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="p-6 border-t border-border bg-card sticky bottom-0 z-10 flex-shrink-0 shadow-top">
            <Button 
                onClick={onOpenBookingModal} 
                size="lg" 
                className="w-full bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out py-3.5 text-lg group"
            >
                <PlusCircle size={24} className="mr-2.5 transition-transform duration-300 group-hover:rotate-90" />
                Book New Appointment
                <ArrowRight size={22} className="ml-auto opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1.5" />
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
