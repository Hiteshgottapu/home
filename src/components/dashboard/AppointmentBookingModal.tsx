
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, User, Stethoscope, MessageCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, Gift, Sparkles, Briefcase, Edit } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isPast, startOfDay, isToday as dateFnsIsToday, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { UpcomingAppointment } from '@/types';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstAppointmentFree?: boolean;
  onBookingSuccess: (newAppointment: UpcomingAppointment) => void; 
}

const mockServices = [
  { id: 's1', name: 'General Check-up', duration: 30, relatedSpecialties: ['general', 'family_medicine'] },
  { id: 's2', name: 'Cardiology Consultation', duration: 45, relatedSpecialties: ['cardiology'] },
  { id: 's3', name: 'Dermatology Consultation', duration: 45, relatedSpecialties: ['dermatology'] },
  { id: 's4', name: 'Pediatric Check-up', duration: 30, relatedSpecialties: ['pediatrics'] },
  { id: 's5', name: 'Neurology Consultation', duration: 50, relatedSpecialties: ['neurology'] },
  { id: 's6', name: 'Mental Health Counseling', duration: 50, relatedSpecialties: ['psychiatry', 'psychology'] },
  { id: 's7', name: 'Physical Therapy Session', duration: 60, relatedSpecialties: ['physical_therapy'] },
  { id: 's8', name: 'Follow-up Visit (General)', duration: 20, relatedSpecialties: ['general', 'family_medicine', 'cardiology', 'dermatology', 'pediatrics', 'neurology'] },
  { id: 's9', name: 'Vaccination Appointment', duration: 15, relatedSpecialties: ['general', 'pediatrics', 'family_medicine'] },
];

const mockDoctors = [
  { id: 'd1', name: 'Dr. Emily Carter', specialty: 'general' },
  { id: 'd2', name: 'Dr. Ben Zhao', specialty: 'cardiology' },
  { id: 'd3', name: 'Dr. Olivia Chen', specialty: 'pediatrics' },
  { id: 'd4', name: 'Dr. Samuel Green', specialty: 'dermatology' },
  { id: 'd5', name: 'Dr. Aisha Khan', specialty: 'neurology' },
  { id: 'd6', name: 'Dr. Carlos Rivera', specialty: 'family_medicine' },
  { id: 'd7', name: 'Dr. Sofia Petrova', specialty: 'psychiatry' },
  { id: 'd8', name: 'Mr. David Lee (PT)', specialty: 'physical_therapy' },
  { id: 'd9', name: 'Dr. Alice Wonderland', specialty: 'general' },
  { id: 'd10', name: 'Dr. Bob The Builder', specialty: 'family_medicine'},
  { id: 'd11', name: 'Dr. Eva Rostova', specialty: 'psychology'},
  { id: 'd12', name: 'Dr. Ken Adams', specialty: 'cardiology'},
];


const step1Schema = z.object({
  serviceId: z.string().min(1, "Please select a service."),
  doctorId: z.string().min(1, "Please select a doctor."),
});

const step2Schema = z.object({
  appointmentDate: z.date({ required_error: "Please select a date." }),
  appointmentTime: z.string().min(1, "Please select a time slot."),
});

const step3Schema = z.object({
  notes: z.string().max(300, "Notes cannot exceed 300 characters.").optional(),
});

type CombinedFormValues = z.infer<typeof step1Schema> & z.infer<typeof step2Schema> & z.infer<typeof step3Schema>;

export function AppointmentBookingModal({ isOpen, onClose, isFirstAppointmentFree = false, onBookingSuccess }: AppointmentBookingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState(mockDoctors);

  const { userProfile, firebaseUser } = useAuth();
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isValid }, trigger } = useForm<CombinedFormValues>({
    resolver: async (data, context, options) => {
      let currentValidationSchema;
      if (currentStep === 1) currentValidationSchema = step1Schema;
      else if (currentStep === 2) currentValidationSchema = step1Schema.merge(step2Schema);
      else currentValidationSchema = step1Schema.merge(step2Schema).merge(step3Schema);
      return zodResolver(currentValidationSchema)(data, context, options);
    },
    mode: 'onChange', // 'onBlur' might be better for performance in some cases
    defaultValues: {
        serviceId: '',
        doctorId: '',
        appointmentDate: undefined,
        appointmentTime: '',
        notes: '',
    }
  });

  const selectedServiceId = watch('serviceId');
  const selectedDoctorId = watch('doctorId');
  const selectedDate = watch('appointmentDate');
  
  useEffect(() => {
    if (selectedServiceId) {
      const service = mockServices.find(s => s.id === selectedServiceId);
      if (service) {
        setFilteredDoctors(mockDoctors.filter(doc => service.relatedSpecialties.includes(doc.specialty)));
      }
      setValue('doctorId', '', { shouldValidate: true }); 
      setValue('appointmentDate', undefined, { shouldValidate: true }); 
      setValue('appointmentTime', '', { shouldValidate: true }); 
    } else {
      setFilteredDoctors(mockDoctors); 
    }
  }, [selectedServiceId, setValue]);

  useEffect(() => {
    if (selectedDoctorId) {
        setValue('appointmentTime', '', { shouldValidate: true });
    }
  }, [selectedDoctorId, setValue]);


  useEffect(() => {
    if (selectedDate && selectedServiceId && selectedDoctorId) {
      const service = mockServices.find(s => s.id === selectedServiceId);
      if (!service) {
        setAvailableTimeSlots([]);
        setValue('appointmentTime', '', { shouldValidate: true }); 
        return;
      }

      const slots: string[] = [];
      const today = startOfDay(new Date());
      const currentSelectedDate = startOfDay(selectedDate);

      if (currentSelectedDate < today && !dateFnsIsToday(currentSelectedDate)) {
        setAvailableTimeSlots([]);
        setValue('appointmentTime', '', { shouldValidate: true });
        return;
      }

      const openingTime = setMinutes(setHours(currentSelectedDate, 9), 0);
      const closingTime = setMinutes(setHours(currentSelectedDate, 17), 0);
      let currentTimePointer = openingTime;

      while (currentTimePointer < closingTime) {
        const slotEnd = new Date(currentTimePointer.getTime() + service.duration * 60000);
        // Check if slot is in the future if it's for today
        if (slotEnd <= closingTime && (dateFnsIsToday(currentSelectedDate) ? currentTimePointer > new Date() : true)) {
          slots.push(format(currentTimePointer, 'HH:mm'));
        }
        // Advance by at least 15 mins or service duration
        currentTimePointer = new Date(currentTimePointer.getTime() + Math.max(15, service.duration) * 60000); 
      }
      setAvailableTimeSlots(slots);
      // If existing time is no longer valid, reset it
      if (watch('appointmentTime') && !slots.includes(watch('appointmentTime')!)) {
        setValue('appointmentTime', '', { shouldValidate: true });
      }
    } else {
      setAvailableTimeSlots([]);
      setValue('appointmentTime', '', { shouldValidate: true }); 
    }
  }, [selectedDate, selectedServiceId, selectedDoctorId, setValue, watch]);


  const handleNextStep = async () => {
    let fieldsToValidate: (keyof CombinedFormValues)[] = [];
    if (currentStep === 1) fieldsToValidate = ['serviceId', 'doctorId'];
    else if (currentStep === 2) fieldsToValidate = ['serviceId', 'doctorId', 'appointmentDate', 'appointmentTime'];
    
    const result = await trigger(fieldsToValidate);
    if (result) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmitForm: SubmitHandler<CombinedFormValues> = async (data) => {
    if (!firebaseUser || !db) {
        toast({ title: "Error", description: "User not authenticated or database not available.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    
    if (!data.appointmentDate || !(data.appointmentDate instanceof Date) || isNaN(data.appointmentDate.getTime())) {
      console.error("Invalid or missing appointmentDate in onSubmit before formatting:", data.appointmentDate);
      toast({
        title: "Booking Error",
        description: "The selected appointment date is invalid. Please go back and select a valid date.",
        variant: "destructive",
        duration: 7000,
      });
      setIsLoading(false);
      return;
    }
    
    const service = mockServices.find(s => s.id === data.serviceId);
    const doctor = mockDoctors.find(d => d.id === data.doctorId);

    if (!service || !doctor) {
        toast({ title: "Booking Error", description: "Selected service or doctor not found.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    const appointmentDateTime = setMinutes(setHours(data.appointmentDate, hours), minutes);

    const newAppointmentData: Omit<UpcomingAppointment, 'id'> = {
        userId: firebaseUser.uid,
        serviceId: data.serviceId,
        serviceName: service.name,
        doctorId: data.doctorId,
        doctorName: doctor.name,
        dateTime: appointmentDateTime.toISOString(),
        notes: data.notes,
        meetingLink: `https://meet.google.com/new-mock-${Date.now()}`, // Mock meeting link
        durationMinutes: service.duration,
    };

    try {
        const appointmentsColRef = collection(db, `users/${firebaseUser.uid}/appointments`);
        const docRef = await addDoc(appointmentsColRef, newAppointmentData);
        
        toast({
          title: "Appointment Booked!",
          description: `Your appointment with ${doctor.name} on ${format(appointmentDateTime, 'PPP')} at ${data.appointmentTime} is confirmed.`,
          variant: 'default',
          duration: 5000,
        });
        
        setIsLoading(false);
        setBookingComplete(true);
        onBookingSuccess({ ...newAppointmentData, id: docRef.id });

    } catch (error) {
        console.error("Error saving appointment to Firestore:", error);
        toast({ title: "Booking Failed", description: "Could not save your appointment. Please try again.", variant: "destructive"});
        setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    reset(); 
    setCurrentStep(1);
    setBookingComplete(false);
    setFilteredDoctors(mockDoctors); 
    onClose();
  };

  const progressValue = (currentStep / 3) * 100;

  if (!isOpen) return null;

  if (bookingComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-6 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-lg">
            <CheckCircle className="h-24 w-24 text-green-500 animate-pulse" />
            <DialogTitle className="text-3xl font-bold text-foreground">Appointment Confirmed!</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Your appointment has been successfully booked. You will receive a confirmation email shortly.
            </DialogDescription>
            <Button onClick={handleCloseDialog} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3.5 text-lg rounded-md shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border bg-card">
        <DialogHeader className="p-6 border-b border-border bg-card">
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-primary"/>
            Book an Appointment
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">Follow the steps below to schedule your consultation.</DialogDescription>
        </DialogHeader>

        {isFirstAppointmentFree && currentStep === 1 && (
          <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 text-white rounded-lg shadow-lg flex items-center gap-3 animate-subtle-pulse">
            <Gift size={28} className="flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">Your First Consultation is Free!</p>
              <p className="text-sm opacity-90">Book today and experience proactive wellness, on us.</p>
            </div>
            <Sparkles size={24} className="ml-auto opacity-80"/>
          </div>
        )}

        <div className="px-6 pt-3 pb-4">
          <Progress value={progressValue} className="w-full h-3 rounded-full bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent [&>div]:transition-all [&>div]:duration-500" />
          <p className="text-sm text-muted-foreground mt-1.5 text-right font-medium">Step {currentStep} of 3</p>
        </div>

        <form onSubmit={handleSubmit(onSubmitForm)} className="flex-grow overflow-y-auto px-6 pb-6 space-y-6">
          {currentStep === 1 && ( 
            <div className="space-y-6 animate-fadeIn">
              <Card className="shadow-lg border border-border hover:shadow-xl hover:border-primary/40 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Briefcase className="text-primary"/>Select Service</CardTitle>
                   <CardDescription>Choose the type of consultation you need.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="serviceId"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            trigger('serviceId'); 
                        }} 
                        value={field.value || ''}
                      >
                        <SelectTrigger className="w-full text-base py-3 rounded-md focus:ring-2 focus:ring-primary/80">
                          <SelectValue placeholder="Choose a service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockServices.map(service => (
                            <SelectItem key={service.id} value={service.id} className="text-base py-2.5">
                              {service.name} ({service.duration} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.serviceId && <p className="text-sm text-destructive mt-1.5">{errors.serviceId.message}</p>}
                </CardContent>
              </Card>

              {selectedServiceId && (
                <Card className="shadow-lg border border-border hover:shadow-xl hover:border-primary/40 transition-all duration-300 animate-fadeIn">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><User className="text-primary"/>Select Doctor</CardTitle>
                    <CardDescription>Choose a specialist for your selected service.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredDoctors.length > 0 ? (
                    <Controller
                      name="doctorId"
                      control={control}
                      render={({ field }) => (
                        <Select 
                          onValueChange={(value) => {
                              field.onChange(value);
                              trigger('doctorId'); 
                          }} 
                          value={field.value || ''}
                        >
                          <SelectTrigger className="w-full text-base py-3 rounded-md focus:ring-2 focus:ring-primary/80">
                            <SelectValue placeholder="Choose a doctor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredDoctors.map(doc => (
                              <SelectItem key={doc.id} value={doc.id} className="text-base py-2.5">
                                {doc.name} - <span className="text-sm text-muted-foreground capitalize">{doc.specialty.replace('_', ' ')}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    /> ) : ( <p className="text-muted-foreground text-center py-4">No doctors available for this service. Please select another service.</p> )
                    }
                    {errors.doctorId && <p className="text-sm text-destructive mt-1.5">{errors.doctorId.message}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 2 && ( 
            <div className="space-y-6 animate-fadeIn">
              <Card className="shadow-lg border border-border hover:shadow-xl hover:border-primary/40 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><CalendarIcon className="text-primary"/>Select Date</CardTitle>
                   <CardDescription>Pick a suitable date for your appointment.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Controller
                    name="appointmentDate"
                    control={control}
                    render={({ field }) => (
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setValue('appointmentTime', '', { shouldValidate: true }); 
                          trigger('appointmentDate'); 
                        }}
                        disabled={(date) => isPast(date) && !dateFnsIsToday(date)}
                        className="rounded-md border-2 border-border shadow-inner bg-background/30 p-4"
                        initialFocus
                      />
                    )}
                  />
                </CardContent>
                {errors.appointmentDate && <p className="px-6 pb-2 text-sm text-destructive">{errors.appointmentDate.message}</p>}
              </Card>

             {selectedDate && selectedDoctorId && selectedServiceId && (
                <Card className="shadow-lg border border-border hover:shadow-xl hover:border-primary/40 transition-all duration-300 animate-fadeIn">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Clock className="text-primary"/>Select Time Slot</CardTitle>
                    <CardDescription>Choose an available time for {format(selectedDate, 'MMMM d, yyyy')}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availableTimeSlots.length > 0 ? (
                        <Controller
                          name="appointmentTime"
                          control={control}
                          render={({ field }) => (
                            <RadioGroup
                              onValueChange={(value) => {
                                  field.onChange(value);
                                  trigger('appointmentTime'); 
                              }}
                              value={field.value || ''}
                              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                            >
                              {availableTimeSlots.map(slot => (
                                <div key={slot} className="flex items-center">
                                  <RadioGroupItem value={slot} id={`time-${slot}`} className="peer sr-only" />
                                  <Label
                                    htmlFor={`time-${slot}`}
                                    className="flex flex-col items-center text-base font-medium justify-between rounded-md border-2 border-muted bg-popover p-3.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary [&:has([data-state=checked])]:border-primary w-full cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
                                  >
                                    {slot}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}
                        />
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No available time slots for this date/doctor/service. Please adjust your selections.</p>
                      )
                    }
                    {errors.appointmentTime && <p className="text-sm text-destructive mt-2">{errors.appointmentTime.message}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 3 && ( 
            <div className="space-y-6 animate-fadeIn">
              <Card className="shadow-xl border border-primary/20 bg-gradient-to-br from-background to-muted/30">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><CheckCircle className="text-primary"/>Review Your Appointment</CardTitle>
                  <CardDescription>Please confirm the details below before booking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-base">
                  <div>
                    <Label className="text-sm text-muted-foreground">Patient</Label>
                    <p className="font-semibold text-lg text-foreground">{userProfile?.name || "Your Name"}</p>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm text-muted-foreground">Service</Label>
                        <p className="font-semibold text-lg text-foreground">{mockServices.find(s => s.id === watch('serviceId'))?.name}</p>
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground">Doctor</Label>
                        <p className="font-semibold text-lg text-foreground">{mockDoctors.find(d => d.id === watch('doctorId'))?.name}</p>
                    </div>
                   </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Date & Time</Label>
                    <p className="font-semibold text-lg text-foreground">
                      {watch('appointmentDate') ? format(watch('appointmentDate')!, 'EEEE, MMMM d, yyyy') : ''} at {watch('appointmentTime')}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-sm text-muted-foreground flex items-center gap-1.5"><Edit size={14}/>Optional Notes for Doctor</Label>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          id="notes"
                          placeholder="e.g., Specific concerns, allergies, or if you need an interpreter (Optional)"
                          {...field}
                          rows={3}
                          className="mt-1 bg-background/50 rounded-md focus:ring-2 focus:ring-primary/80 text-base"
                        />
                      )}
                    />
                    {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="p-6 border-t border-border bg-card sticky bottom-0 !mt-auto shadow-top">
            <div className="flex w-full justify-between items-center">
              <Button
                variant="outline"
                type="button"
                onClick={handlePreviousStep}
                disabled={currentStep === 1 || isLoading}
                className="py-3.5 px-6 text-base rounded-md shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 hover:bg-muted/70 active:scale-95"
              >
                <ChevronLeft className="mr-2 h-5 w-5" /> Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isLoading || !isValid } 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 px-6 text-base rounded-md shadow-md hover:shadow-lifted transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  Next <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !isValid}
                  className="bg-green-600 hover:bg-green-700 text-white py-3.5 px-6 text-base rounded-md shadow-lg hover:shadow-lifted-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                  Confirm Appointment
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
