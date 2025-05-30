
"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { TrendingUp, Activity, FilePlus, MessageSquareWarning, ShieldCheck, Zap, ListChecks, Lightbulb, BarChartHorizontalBig, Download, CalendarCheck, Target, Timer, Eye, Gift, Briefcase, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ActiveGoalTaskMenu } from '@/components/dashboard/ActiveGoalTaskMenu';
import { ManagedPrescriptionsModal } from '@/components/dashboard/ManagedPrescriptionsModal';
import { InteractionLogModal } from '@/components/dashboard/InteractionLogModal';
import type { DoctorNote, Prescription, UpcomingAppointment } from '@/types';
import { AppointmentBookingModal } from '@/components/dashboard/AppointmentBookingModal';
import { UpcomingAppointmentsViewModal } from '@/components/dashboard/UpcomingAppointmentsViewModal';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Unsubscribe, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


const mockChartData = [
  { month: "Jan", tasks: Math.floor(Math.random() * 20) + 5, goals: Math.floor(Math.random() * 5) + 1 },
  { month: "Feb", tasks: Math.floor(Math.random() * 20) + 5, goals: Math.floor(Math.random() * 5) + 1 },
  { month: "Mar", tasks: Math.floor(Math.random() * 20) + 5, goals: Math.floor(Math.random() * 5) + 1 },
  { month: "Apr", tasks: Math.floor(Math.random() * 20) + 5, goals: Math.floor(Math.random() * 5) + 1 },
  { month: "May", tasks: Math.floor(Math.random() * 20) + 5, goals: Math.floor(Math.random() * 5) + 1 },
  { month: "Jun", tasks: Math.floor(Math.random() * 20) + 5, goals: Math.floor(Math.random() * 5) + 1 },
];

const chartConfig = {
  tasks: { label: "Tasks Completed", color: "hsl(var(--primary))" },
  goals: { label: "Goals Achieved", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

const mockPieData = [
  { name: 'Completed', value: 7, fill: 'hsl(var(--primary))' },
  { name: 'In Progress', value: 3, fill: 'hsl(var(--accent))' },
  { name: 'Pending', value: 2, fill: 'hsl(var(--muted))' },
];

// AI Chat logs can remain mock for now as their persistence is more complex
const mockAiChatLogs = [
  { id: 'ai_1', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), userQuery: "I've had a persistent cough and mild fever for 3 days.", aiResponse: "Based on your symptoms, potential conditions include a common cold or flu. It's advisable to monitor your symptoms and rest. If they worsen, please consult a doctor." },
  { id: 'ai_2', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), userQuery: "What are some good exercises for lower back pain?", aiResponse: "Gentle stretches like pelvic tilts and knee-to-chest stretches can be beneficial. Avoid strenuous activities and consult a physical therapist for a personalized plan." },
];


export default function DashboardPage() {
  const { userProfile, firebaseUser, isLoading: authIsLoading, healthGoals } = useAuth();
  const { toast } = useToast();
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isPrescriptionsModalOpen, setIsPrescriptionsModalOpen] = useState(false);
  const [isInteractionLogModalOpen, setIsInteractionLogModalOpen] = useState(false);
  const [isAppointmentBookingModalOpen, setIsAppointmentBookingModalOpen] = useState(false);
  const [isAppointmentsViewModalOpen, setIsAppointmentsViewModalOpen] = useState(false);

  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [managedPrescriptions, setManagedPrescriptions] = useState<Prescription[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [dataLoading, setDataLoading] = useState(true);


  useEffect(() => {
    if (!firebaseUser || !db) {
      if (!authIsLoading) setDataLoading(false);
      return;
    }

    console.log("DashboardPage: Setting up Firestore listeners for user:", firebaseUser.uid);
    setDataLoading(true);
    const unsubscribes: Unsubscribe[] = [];
    
    let initialFetchesCompleted = 0;
    const totalInitialFetches = 3; // Appointments, Prescriptions, Notes

    const checkAllInitialDataLoaded = () => {
      initialFetchesCompleted++;
      if (initialFetchesCompleted >= totalInitialFetches) {
        setDataLoading(false);
        console.log("DashboardPage: All initial data fetches completed.");
      }
    };

    // Fetch Upcoming Appointments
    const appointmentsQuery = query(collection(db, `users/${firebaseUser.uid}/appointments`), orderBy("dateTime", "asc"));
    unsubscribes.push(onSnapshot(appointmentsQuery, (snapshot) => {
      const appts: UpcomingAppointment[] = [];
      snapshot.forEach(doc => appts.push({ id: doc.id, ...doc.data() } as UpcomingAppointment));
      setUpcomingAppointments(appts.sort((a,b) => compareAsc(parseISO(a.dateTime), parseISO(b.dateTime))));
      console.log("DashboardPage: Appointments updated via snapshot. Count:", appts.length);
      if (dataLoading && initialFetchesCompleted < totalInitialFetches) checkAllInitialDataLoaded();
    }, (error) => {
      console.error("DashboardPage: Error fetching appointments:", error);
      toast({ title: "Error Fetching Appointments", description: "Could not fetch upcoming appointments.", variant: "destructive" });
      if (dataLoading && initialFetchesCompleted < totalInitialFetches) checkAllInitialDataLoaded();
    }));

    // Fetch Managed Prescriptions
    const prescriptionsQuery = query(collection(db, `users/${firebaseUser.uid}/prescriptions`), orderBy("uploadDate", "desc"));
    unsubscribes.push(onSnapshot(prescriptionsQuery, (snapshot) => {
      const scripts: Prescription[] = [];
      snapshot.forEach(doc => scripts.push({ id: doc.id, ...doc.data() } as Prescription));
      setManagedPrescriptions(scripts);
      console.log("DashboardPage: Prescriptions updated via snapshot. Count:", scripts.length);
      if (dataLoading && initialFetchesCompleted < totalInitialFetches) checkAllInitialDataLoaded();
    }, (error) => {
      console.error("DashboardPage: Error fetching prescriptions:", error);
      toast({ title: "Error Fetching Prescriptions", description: "Could not fetch managed prescriptions.", variant: "destructive" });
      if (dataLoading && initialFetchesCompleted < totalInitialFetches) checkAllInitialDataLoaded();
    }));

    // Fetch Doctor Notes
    const notesQuery = query(collection(db, `users/${firebaseUser.uid}/doctorNotes`), orderBy("date", "desc"));
    unsubscribes.push(onSnapshot(notesQuery, (snapshot) => {
      const notes: DoctorNote[] = [];
      snapshot.forEach(doc => notes.push({ id: doc.id, ...doc.data() } as DoctorNote));
      setDoctorNotes(notes);
      console.log("DashboardPage: Doctor notes updated via snapshot. Count:", notes.length);
      if (dataLoading && initialFetchesCompleted < totalInitialFetches) checkAllInitialDataLoaded();
    }, (error) => {
      console.error("DashboardPage: Error fetching doctor notes:", error);
      toast({ title: "Error Fetching Doctor Notes", description: "Could not fetch doctor notes.", variant: "destructive" });
      if (dataLoading && initialFetchesCompleted < totalInitialFetches) checkAllInitialDataLoaded();
    }));

    return () => {
      console.log("DashboardPage: Unsubscribing from Firestore listeners.");
      unsubscribes.forEach(unsub => unsub());
    };
  }, [firebaseUser, authIsLoading, toast]);


  const handleBookingSuccess = async (newAppointment: UpcomingAppointment) => {
    if (!firebaseUser || !db) {
        toast({ title: "Booking Error", description: "Could not save appointment. User not found.", variant: "destructive" });
        return;
    }
    try {
      // Firestore onSnapshot for appointments will update the upcomingAppointments state,
      // so we primarily just show a toast and ensure modals are in the correct state.
      // The new appointment object is already created by AppointmentBookingModal and saved to Firestore there.
      
      toast({
        title: "Appointment Confirmed!",
        description: `Your appointment for ${newAppointment.serviceName} with ${newAppointment.doctorName} on ${format(parseISO(newAppointment.dateTime), 'PPPp')} is booked.`,
      });
      setIsAppointmentBookingModalOpen(false);
      setIsAppointmentsViewModalOpen(true); // Show the view modal with the updated list
    } catch (error) {
        console.error("Error reacting to appointment booking success on dashboard:", error);
        toast({ title: "Booking Display Issue", description: "There was an issue updating the appointment display. Please refresh if needed.", variant: "destructive"});
    }
  };

  const handleOpenBookingModal = () => {
    setIsAppointmentsViewModalOpen(false);
    setIsAppointmentBookingModalOpen(true);
  };


  if (authIsLoading || (dataLoading && !firebaseUser)) {
    return (
      <div className="container mx-auto py-2 px-0 md:px-4">
         <div className="mb-8">
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mb-6">
            <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-12 w-1/3 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-12 w-1/3 mb-4" />
        <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }
  
  if (!userProfile && !authIsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading user profile...</p>
      </div>
    );
  }
  if (!userProfile) {
     return (
      <div className="flex items-center justify-center h-full">
        <p>User profile not found. Please try logging in again.</p>
      </div>
    );
  }

  const activeGoalsCount = (healthGoals || []).filter(g => g.status === 'in_progress').length;
  const prescriptionsCount = managedPrescriptions.length;
  const interactionLogsCount = mockAiChatLogs.length + doctorNotes.length;
  const currentUpcomingAppointmentsCount = upcomingAppointments.length;


  return (
    <div className="container mx-auto py-2 px-0 md:px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">
          Hello, {userProfile.name} 👋
        </h1>
        <p className="text-lg text-muted-foreground">Let's take charge of your well-being today.</p>
      </div>

      <div className="mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[1.01] animate-subtle-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                 <Lightbulb className="h-6 w-6 text-primary animate-pulse" />
                Today's Focus
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Stay hydrated for better energy!</CardDescription>
            </div>
             <Zap className="h-5 w-5 text-primary/70"/>
          </CardHeader>
          <CardContent>
            <p className="text-base text-foreground">Aim for 8 glasses of water. Small sips throughout the day make a big difference.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-100 cursor-pointer group"
          onClick={() => setIsTaskMenuOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open active health goals task menu"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">Active Health Goals</CardTitle>
            <ListChecks className="h-5 w-5 text-accent transition-transform group-hover:rotate-6" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{activeGoalsCount}</div>
            <p className="text-xs text-muted-foreground">{activeGoalsCount > 0 ? 'Making progress!' : 'Set a new goal!'}</p>
          </CardContent>
        </Card>

        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-100 cursor-pointer group"
          onClick={() => setIsPrescriptionsModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="View managed prescriptions"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Managed Prescriptions</CardTitle>
            <FilePlus className="h-5 w-5 text-primary transition-transform group-hover:rotate-6" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{prescriptionsCount}</div>
            <p className="text-xs text-muted-foreground">{prescriptionsCount > 0 ? `View details & insights` : `Upload your first script`}</p>
          </CardContent>
        </Card>

        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-100 cursor-pointer group"
          onClick={() => setIsInteractionLogModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="View interaction log"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground group-hover:text-destructive transition-colors">Interaction Log</CardTitle>
            <MessageSquareWarning className="h-5 w-5 text-destructive transition-transform group-hover:rotate-6" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{interactionLogsCount}</div>
            <p className="text-xs text-muted-foreground">AI chats & doctor notes.</p>
          </CardContent>
        </Card>

        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-100 cursor-pointer group"
          onClick={() => setIsAppointmentsViewModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Book or view upcoming appointments"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Upcoming Appointments</CardTitle>
            <CalendarCheck className="h-5 w-5 text-primary transition-transform group-hover:rotate-6" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentUpcomingAppointmentsCount}</div>
            <p className="text-xs text-muted-foreground">{currentUpcomingAppointmentsCount > 0 ? `Ready for your next visit` : `Schedule an appointment`}</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/insights#upload" passHref>
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-sm shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 group">
              <FilePlus className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <span className="font-medium">Upload Prescription</span>
            </Button>
          </Link>
          <Link href="/ai-assistant" passHref>
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-sm shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 group">
              <Activity className="h-8 w-8 text-accent transition-transform group-hover:scale-110" />
              <span className="font-medium">Analyze Symptoms</span>
            </Button>
          </Link>
           <Link href="/profile#goals" passHref>
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-sm shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 group">
              <ListChecks className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <span className="font-medium">View Health Goals</span>
            </Button>
          </Link>
          <Link href="/profile#privacy" passHref>
           <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-sm shadow-sm hover:shadow-lg hover:border-muted-foreground/30 hover:-translate-y-1 active:scale-95 transition-all duration-300 group">
              <ShieldCheck className="h-8 w-8 text-muted-foreground transition-transform group-hover:scale-110" />
              <span className="font-medium">Data & Privacy</span>
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Your Progress Overview</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Monthly Activity</CardTitle>
              <CardDescription>Overview of tasks completed and goals achieved.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
               <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart accessibilityLayer data={mockChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
                  <Bar dataKey="goals" fill="var(--color-goals)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Health Goals Status</CardTitle>
               <CardDescription>Current breakdown of your health goals.</CardDescription>
            </CardHeader>
            <CardContent  className="h-[300px] w-full flex items-center justify-center">
              <ChartContainer config={chartConfig} className="w-full h-full aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={mockPieData} dataKey="value" nameKey="name" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                     {mockPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} className="pt-4" />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {(healthGoals || []).length === 0 && managedPrescriptions.length === 0 && upcomingAppointments.length === 0 && !dataLoading && !authIsLoading && (
         <section className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto p-8 sm:p-12 bg-card shadow-lifted-lg border border-primary/10">
                <BarChartHorizontalBig data-ai-hint="health chart statistics" className="h-20 w-20 text-primary mx-auto mb-6 animate-bounce" />
                <h2 className="text-3xl font-semibold mb-3 text-foreground">Welcome to VitaLog Pro!</h2>
                <p className="text-lg text-muted-foreground mb-8">
                    Your personal health dashboard is ready. Upload your first prescription, set a health goal, or book an appointment to unlock personalized insights and embark on your journey to proactive wellness.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="transition-all duration-300 active:scale-95 text-base py-3 px-6 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <Link href="/insights#upload">Upload Prescription</Link>
                    </Button>
                     <Button variant="outline" size="lg" onClick={() => setIsAppointmentsViewModalOpen(true)} className="transition-all duration-300 active:scale-95 text-base py-3 px-6 hover:bg-accent/20 hover:border-accent shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                        Book Appointment
                    </Button>
                     <Button variant="outline" size="lg" onClick={() => setIsTaskMenuOpen(true)} className="transition-all duration-300 active:scale-95 text-base py-3 px-6 hover:bg-accent/20 hover:border-accent shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                        Set a Health Goal
                    </Button>
                </div>
            </Card>
        </section>
      )}
      <ActiveGoalTaskMenu isOpen={isTaskMenuOpen} onClose={() => setIsTaskMenuOpen(false)} />
      <ManagedPrescriptionsModal
        isOpen={isPrescriptionsModalOpen}
        onClose={() => setIsPrescriptionsModalOpen(false)}
        prescriptions={managedPrescriptions}
      />
      <InteractionLogModal
        isOpen={isInteractionLogModalOpen}
        onClose={() => setIsInteractionLogModalOpen(false)}
        aiChatLogs={mockAiChatLogs}
        doctorNotes={doctorNotes}
      />
      <UpcomingAppointmentsViewModal
        isOpen={isAppointmentsViewModalOpen}
        onClose={() => setIsAppointmentsViewModalOpen(false)}
        appointments={upcomingAppointments}
        onOpenBookingModal={handleOpenBookingModal}
      />
      <AppointmentBookingModal
        isOpen={isAppointmentBookingModalOpen}
        onClose={() => setIsAppointmentBookingModalOpen(false)}
        isFirstAppointmentFree={currentUpcomingAppointmentsCount === 0}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
}

