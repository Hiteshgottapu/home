
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Calendar as CalendarIcon, Clock, User, Stethoscope, MessageCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isPast, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock Data
const mockServices = [
  { id: 's1', name: 'General Check-up', duration: 30 },
  { id: 's2', name: 'Specialist Consultation', duration: 45 },
  { id: 's3', name: 'Follow-up Visit', duration: 20 },
  { id: 's4', name: 'Vaccination', duration: 15 },
];

const mockDoctors = [
  { id: 'd1', name: 'Dr. Emily Carter', specialty: 'General Physician' },
  { id: 'd2', name: 'Dr. Ben Zhao', specialty: 'Cardiologist' },
  { id: 'd3', name: 'Dr. Olivia Chen', specialty: 'Pediatrician' },
  { id: 'd4', name: 'Dr. Samuel Green', specialty: 'Dermatologist' },
];

// Schemas for multi-step form
const step1Schema = z.object({
  serviceId: z.string().min(1, "Please select a service."),
  doctorId: z.string().min(1, "Please select a doctor."),
});
type Step1Values = z.infer<typeof step1Schema>;

const step2Schema = z.object({
  appointmentDate: z.date({ required_error: "Please select a date." }),
  appointmentTime: z.string().min(1, "Please select a time slot."),
});
type Step2Values = z.infer<typeof step2Schema>;

const step3Schema = z.object({
  notes: z.string().max(300, "Notes cannot exceed 300 characters.").optional(),
});
type Step3Values = z.infer<typeof step3Schema>;

type CombinedFormValues = Step1Values & Step2Values & Step3Values;

export function AppointmentBookingModal({ isOpen, onClose }: AppointmentBookingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const { userProfile } = useAuth();
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm<CombinedFormValues>({
    resolver: async (data, context, options) => {
      let currentValidationSchema;
      if (currentStep === 1) {
        currentValidationSchema = step1Schema;
      } else if (currentStep === 2) {
        currentValidationSchema = step1Schema.merge(step2Schema); // Validate step1 + step2 data
      } else { // currentStep === 3 (this is also for the final submission)
        currentValidationSchema = step1Schema.merge(step2Schema).merge(step3Schema); // Validate all collected data
      }
      return zodResolver(currentValidationSchema)(data, context, options);
    },
    mode: 'onChange', // Validate on change for better UX
  });

  const selectedDate = watch('appointmentDate');
  const selectedServiceId = watch('serviceId');

  // Generate time slots based on selected date and service duration
  useEffect(() => {
    if (selectedDate && selectedServiceId) {
      const service = mockServices.find(s => s.id === selectedServiceId);
      if (!service) return;

      const slots: string[] = [];
      const today = startOfDay(new Date());
      const currentSelectedDate = startOfDay(selectedDate);

      // Only generate slots if the selected date is not in the past
      if (currentSelectedDate < today) {
        setAvailableTimeSlots([]);
        setValue('appointmentTime', ''); // Clear selected time if date is past
        return;
      }

      const openingTime = setMinutes(setHours(selectedDate, 9), 0); // 9:00 AM
      const closingTime = setMinutes(setHours(selectedDate, 17), 0); // 5:00 PM
      let currentTime = openingTime;

      while (currentTime < closingTime) {
        const slotEnd = new Date(currentTime.getTime() + service.duration * 60000);
        if (slotEnd <= closingTime && !isPast(currentTime)) { // Also check if slot start time is not past
          slots.push(format(currentTime, 'HH:mm'));
        }
        currentTime = new Date(currentTime.getTime() + service.duration * 60000); // Or some other interval like 30 mins
      }
      setAvailableTimeSlots(slots);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDate, selectedServiceId, setValue]);
  

  const handleNextStep = async () => {
    // Trigger validation for current step (using the merged schema up to current step)
    const result = await handleSubmit(() => { 
        setCurrentStep(prev => Math.min(prev + 1, 3)); // Max step is 3 for form input
    })();
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: CombinedFormValues) => {
    // This onSubmit is called only when the final "Confirm Appointment" button is clicked.
    // currentStep will be 3 at this point.
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Submitting Appointment Data:", data);

    // Defensive check for appointmentDate
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

    toast({
      title: "Appointment Booked!",
      description: `Your appointment with ${mockDoctors.find(d => d.id === data.doctorId)?.name} on ${format(data.appointmentDate, 'PPP')} at ${data.appointmentTime} is confirmed.`,
      variant: 'default',
      duration: 5000,
    });
    setIsLoading(false);
    setBookingComplete(true);
  };

  const handleCloseDialog = () => {
    reset();
    setCurrentStep(1);
    setBookingComplete(false);
    onClose();
  };

  const progressValue = (currentStep / 3) * 100;

  if (!isOpen) return null;

  if (bookingComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
            <CheckCircle className="h-20 w-20 text-green-500 animate-pulse" />
            <DialogTitle className="text-2xl font-bold text-foreground">Appointment Confirmed!</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your appointment has been successfully booked. You will receive a confirmation email shortly.
            </DialogDescription>
            <Button onClick={handleCloseDialog} className="w-full mt-4">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-muted/30">
          <DialogTitle className="text-2xl font-semibold text-foreground">Book an Appointment</DialogTitle>
          <DialogDescription>Follow the steps below to schedule your visit.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-2 pb-4">
            <Progress value={progressValue} className="w-full h-2 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent" />
            <p className="text-xs text-muted-foreground mt-1 text-right">Step {currentStep} of 3</p>
        </div>
        
        {/* Use a single form tag that wraps all steps */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto px-6 pb-6 space-y-6">
          {/* Step 1: Service and Doctor Selection */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Stethoscope className="text-primary"/>Select Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="serviceId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full text-base py-3">
                          <SelectValue placeholder="Choose a service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockServices.map(service => (
                            <SelectItem key={service.id} value={service.id} className="text-base py-2">
                              {service.name} ({service.duration} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.serviceId && <p className="text-sm text-destructive mt-1">{errors.serviceId.message}</p>}
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><User className="text-primary"/>Select Doctor</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="doctorId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full text-base py-3">
                          <SelectValue placeholder="Choose a doctor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockDoctors.map(doc => (
                            <SelectItem key={doc.id} value={doc.id} className="text-base py-2">
                              {doc.name} - <span className="text-sm text-muted-foreground">{doc.specialty}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.doctorId && <p className="text-sm text-destructive mt-1">{errors.doctorId.message}</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Date and Time Selection */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><CalendarIcon className="text-primary"/>Select Date</CardTitle>
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
                                    setValue('appointmentTime', ''); // Reset time when date changes
                                }}
                                disabled={(date) => isPast(date) && !isToday(date)} // Disable past dates but not today
                                className="rounded-md border"
                                initialFocus
                            />
                        )}
                    />
                </CardContent>
                 {errors.appointmentDate && <p className="px-6 pb-2 text-sm text-destructive">{errors.appointmentDate.message}</p>}
              </Card>
              
              <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Clock className="text-primary"/>Select Time Slot</CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedDate ? (
                         availableTimeSlots.length > 0 ? (
                            <Controller
                                name="appointmentTime"
                                control={control}
                                render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                >
                                    {availableTimeSlots.map(slot => (
                                    <div key={slot} className="flex items-center">
                                        <RadioGroupItem value={slot} id={`time-${slot}`} className="peer sr-only" />
                                        <Label
                                        htmlFor={`time-${slot}`}
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary [&:has([data-state=checked])]:border-primary w-full cursor-pointer transition-all duration-200"
                                        >
                                        {slot}
                                        </Label>
                                    </div>
                                    ))}
                                </RadioGroup>
                                )}
                            />
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No available time slots for this date. Please select another date or service.</p>
                        )
                    ) : (
                        <p className="text-muted-foreground text-center py-4">Please select a date first to see available time slots.</p>
                    )}
                    {errors.appointmentTime && <p className="text-sm text-destructive mt-2">{errors.appointmentTime.message}</p>}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 3: Details and Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <Card className="shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><CheckCircle className="text-primary"/>Review Your Appointment</CardTitle>
                  <CardDescription>Please confirm the details below before booking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Patient</Label>
                    <p className="font-medium text-foreground">{userProfile?.name || "Your Name"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Service</Label>
                    <p className="font-medium text-foreground">{mockServices.find(s => s.id === watch('serviceId'))?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Doctor</Label>
                    <p className="font-medium text-foreground">{mockDoctors.find(d => d.id === watch('doctorId'))?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date & Time</Label>
                    <p className="font-medium text-foreground">
                      {watch('appointmentDate') ? format(watch('appointmentDate')!, 'EEEE, MMMM d, yyyy') : ''} at {watch('appointmentTime')}
                    </p>
                  </div>
                   <div>
                    <Label htmlFor="notes" className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle size={14}/>Optional Notes</Label>
                     <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                            <Textarea 
                                id="notes" 
                                placeholder="Any specific concerns or requests for the doctor? (Optional)" 
                                {...field} 
                                rows={3}
                                className="mt-1 bg-background/50"
                            />
                        )}
                    />
                    {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        

          {/* Footer is outside the step-specific rendering, but inside the form */}
          <DialogFooter className="p-6 border-t bg-muted/30 sticky bottom-0 !mt-auto"> {/* !mt-auto to override space-y from parent */}
            <div className="flex w-full justify-between items-center">
              <Button variant="outline" type="button" onClick={handlePreviousStep} disabled={currentStep === 1 || isLoading}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              
              {currentStep < 3 && (
                <Button type="button" onClick={handleNextStep} disabled={isLoading || !isValid}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {currentStep === 3 && (
                <Button type="submit" disabled={isLoading || !isValid} className="bg-green-600 hover:bg-green-700 text-white">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Confirm Appointment
                </Button>
              )}
            </div>
          </DialogFooter>
        </form> {/* Form tag closes here */}
      </DialogContent>
    </Dialog>
  );
}

// Helper function, if not already in utils
const isToday = (someDate: Date) => {
  const today = new Date();
  return someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear();
};

    