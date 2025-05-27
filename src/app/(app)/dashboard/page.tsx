
"use client";
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { TrendingUp, Activity, FilePlus, MessageSquareWarning, ShieldCheck, Zap, ListChecks, Lightbulb, BarChartHorizontalBig, Download, CalendarCheck, Target, Timer, Eye, Gift } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ActiveGoalTaskMenu } from '@/components/dashboard/ActiveGoalTaskMenu';
import { ManagedPrescriptionsModal } from '@/components/dashboard/ManagedPrescriptionsModal';
import { InteractionLogModal, type MockAiChatEntry, type MockDoctorNoteEntry } from '@/components/dashboard/InteractionLogModal';
import { AppointmentBookingModal } from '@/components/dashboard/AppointmentBookingModal';
import { useToast } from "@/hooks/use-toast";


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

const mockDashboardPrescriptions = [
  {
    id: 'dash_pres_1',
    fileName: 'Initial_Amoxicillin_Rx.pdf',
    uploadDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'verified' as const,
    extractedMedications: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily' }],
    ocrConfidence: 0.95,
    imageUrl: 'https://placehold.co/400x500.png',
    patientName: 'Alex Ryder',
    doctor: 'Dr. Emily Carter'
  },
  {
    id: 'dash_pres_2',
    fileName: 'FollowUp_Lisinopril.jpg',
    uploadDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'needs_correction' as const,
    extractedMedications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily (Morning)' }, { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals'}],
    ocrConfidence: 0.78,
    imageUrl: 'https://placehold.co/400x550.png',
    patientName: 'Alex Ryder',
    doctor: 'Dr. Ben Zhao'
  },
];

const mockAiChatLogs: MockAiChatEntry[] = [
  { id: 'ai_1', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), userQuery: "I've had a persistent cough and mild fever for 3 days.", aiResponse: "Based on your symptoms, potential conditions include a common cold or flu. It's advisable to monitor your symptoms and rest. If they worsen, please consult a doctor." },
  { id: 'ai_2', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), userQuery: "What are some good exercises for lower back pain?", aiResponse: "Gentle stretches like pelvic tilts and knee-to-chest stretches can be beneficial. Avoid strenuous activities and consult a physical therapist for a personalized plan." },
];

const mockDoctorNotes: MockDoctorNoteEntry[] = [
  { id: 'doc_1', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), doctorName: "Dr. Emily Carter", note: "Follow-up on blood pressure. Medication seems effective. Advised to continue current dosage and monitor diet. Next check-up in 3 months.", appointmentId: "appt_123" },
  { id: 'doc_2', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), doctorName: "Dr. Ben Zhao", note: "Discussed results of recent lab tests. Cholesterol levels slightly elevated. Recommended dietary changes and re-test in 6 weeks.", appointmentId: "appt_456" },
];


export default function DashboardPage() {
  const { userProfile: user } = useAuth();
  const { toast } = useToast();
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isPrescriptionsModalOpen, setIsPrescriptionsModalOpen] = useState(false);
  const [isInteractionLogModalOpen, setIsInteractionLogModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [upcomingAppointmentsCount, setUpcomingAppointmentsCount] = useState(0);

  const handleBookingSuccess = () => {
    setUpcomingAppointmentsCount(prevCount => prevCount + 1);
    // Optional: show a toast confirmation on the dashboard side if needed
    // toast({
    //   title: "Appointment Confirmed on Dashboard!",
    //   description: "Your new appointment is reflected here.",
    // });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading user data...</p>
      </div>
    );
  }

  const activeGoalsCount = user.healthGoals.filter(g => g.status === 'in_progress').length;
  const prescriptionsCount = mockDashboardPrescriptions.length;


  return (
    <div className="container mx-auto py-2 px-0 md:px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Hello, {user.name} 👋
        </h1>
        <p className="text-muted-foreground">Let's take charge of your well-being today.</p>
      </div>

      <div className="mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-primary">Today's Focus</CardTitle>
              <CardDescription className="text-sm">Stay hydrated for better energy!</CardDescription>
            </div>
            <Lightbulb className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">Aim for 8 glasses of water. Small sips throughout the day make a big difference.</p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/10">Dismiss</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
          onClick={() => setIsTaskMenuOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open active health goals task menu"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Health Goals</CardTitle>
            <ListChecks className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{activeGoalsCount}</div>
            <p className="text-xs text-muted-foreground">Keep up the great work!</p>
          </CardContent>
        </Card>

        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
          onClick={() => setIsPrescriptionsModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="View managed prescriptions"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Prescriptions</CardTitle>
            <FilePlus className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{prescriptionsCount}</div>
            <p className="text-xs text-muted-foreground">{prescriptionsCount > 0 ? `View details` : `Awaiting first upload.`}</p>
          </CardContent>
        </Card>

        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
          onClick={() => setIsInteractionLogModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="View interaction log"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interaction Log</CardTitle>
            <MessageSquareWarning className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{mockAiChatLogs.length + mockDoctorNotes.length}</div>
            <p className="text-xs text-muted-foreground">View AI chats & doctor notes.</p>
          </CardContent>
        </Card>

        <Card
          className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
          onClick={() => setIsAppointmentModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Book or view upcoming appointments"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <CalendarCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{upcomingAppointmentsCount}</div>
            <p className="text-xs text-muted-foreground">{upcomingAppointmentsCount > 0 ? `View appointments` : `Book an appointment`}</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/insights#upload" passHref>
            <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1 text-sm shadow-sm hover:shadow-md transition-shadow duration-300">
              <FilePlus className="h-6 w-6 text-primary" />
              Upload Prescription
            </Button>
          </Link>
          <Link href="/ai-assistant" passHref>
            <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1 text-sm shadow-sm hover:shadow-md transition-shadow duration-300">
              <Activity className="h-6 w-6 text-accent" />
              Analyze Symptoms
            </Button>
          </Link>
           <Link href="/profile#goals" passHref>
            <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1 text-sm shadow-sm hover:shadow-md transition-shadow duration-300">
              <ListChecks className="h-6 w-6 text-primary" />
              View Health Goals
            </Button>
          </Link>
          <Link href="/profile#privacy" passHref>
           <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1 text-sm shadow-sm hover:shadow-md transition-shadow duration-300">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
              Data & Privacy
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Your Progress Overview</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Monthly Activity</CardTitle>
              <CardDescription>Overview of tasks and goals.</CardDescription>
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
               <CardDescription>Current breakdown of your goals.</CardDescription>
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

      {activeGoalsCount === 0 && prescriptionsCount === 0 && (
         <section className="mt-12 text-center">
            <Card className="max-w-lg mx-auto p-8 bg-card shadow-lg">
                <BarChartHorizontalBig data-ai-hint="health chart" className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2 text-foreground">Welcome to VitaLog Pro!</h2>
                <p className="text-muted-foreground mb-6">
                    Your personal health dashboard is ready. Upload your first prescription or check your symptoms to see personalized insights and start your journey to proactive wellness.
                </p>
                <div className="flex gap-4 justify-center">
                    <Button asChild size="lg">
                        <Link href="/insights#upload">Upload Prescription</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/ai-assistant">Analyze Symptoms</Link>
                    </Button>
                </div>
            </Card>
        </section>
      )}
      <ActiveGoalTaskMenu isOpen={isTaskMenuOpen} onClose={() => setIsTaskMenuOpen(false)} />
      <ManagedPrescriptionsModal
        isOpen={isPrescriptionsModalOpen}
        onClose={() => setIsPrescriptionsModalOpen(false)}
        prescriptions={mockDashboardPrescriptions}
      />
      <InteractionLogModal
        isOpen={isInteractionLogModalOpen}
        onClose={() => setIsInteractionLogModalOpen(false)}
        aiChatLogs={mockAiChatLogs}
        doctorNotes={mockDoctorNotes}
      />
      <AppointmentBookingModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        isFirstAppointmentFree={upcomingAppointmentsCount === 0}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
}
