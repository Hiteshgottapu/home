
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, ShieldCheck, Target, BellRing, PlusCircle, Edit3, Download, LogOut, Trash2 } from 'lucide-react';
import { HealthGoalItem } from '@/components/profile/HealthGoalItem';
import { HealthGoalModal } from '@/components/profile/HealthGoalModal';
import type { HealthGoal, AiFeedbackPreferences } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function ProfilePage() {
  const { userProfile: user, updateUserProfileState: updateUserProfile, addHealthGoal, updateHealthGoal: authUpdateHealthGoal, updateAiPreferences, logout } = useAuth();
  const { toast } = useToast();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);
  
  // Editable AI preferences:
  const [currentAiPreferences, setCurrentAiPreferences] = useState<AiFeedbackPreferences | undefined>(user?.aiFeedbackPreferences);

  if (!user) {
    return <p>Loading profile...</p>;
  }

  const handleSaveGoal = (goalData: Omit<HealthGoal, 'id'> | HealthGoal) => {
    if ('id' in goalData) { // Editing existing goal
      authUpdateHealthGoal(goalData);
      toast({ title: "Goal Updated", description: `"${goalData.description}" has been updated.` });
    } else { // Adding new goal
      addHealthGoal(goalData);
      toast({ title: "Goal Added", description: `New goal "${goalData.description}" created.` });
    }
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  const handleEditGoal = (goal: HealthGoal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = user.healthGoals.filter(g => g.id !== goalId);
    updateUserProfile({ healthGoals: updatedGoals }); 
    toast({ title: "Goal Deleted", variant: "destructive" });
  };
  
  const handleAiPreferenceChange = (key: keyof AiFeedbackPreferences, value: string) => {
    if (user && currentAiPreferences) { // Ensure user is defined
        const newPrefs = {...currentAiPreferences, [key]: value};
        setCurrentAiPreferences(newPrefs);
        updateAiPreferences(newPrefs); 
        toast({ title: "AI Preferences Updated" });
    }
  };
  
  // Update local AI preferences state if user context changes
  useEffect(() => {
    if (user?.aiFeedbackPreferences) {
      setCurrentAiPreferences(user.aiFeedbackPreferences);
    }
  }, [user?.aiFeedbackPreferences]);


  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <UserCog className="h-8 w-8" /> Profile & Settings
        </h1>
        <p className="text-muted-foreground">Manage your personal information, health goals, and preferences.</p>
      </div>

      {/* User Details Section */}
      <Card className="shadow-md" id="details">
        <CardHeader>
          <CardTitle className="text-xl">Personal Details</CardTitle>
          <CardDescription>This information is kept secure and private.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={user.name} readOnly disabled className="bg-muted/30"/>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={user.phoneNumber || ''} readOnly disabled className="bg-muted/30"/>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={user.email || ''} readOnly disabled className="bg-muted/30"/>
            </div>
             <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : ''} readOnly disabled className="bg-muted/30"/>
            </div>
          </div>
          {/* In a real app, an "Edit Profile" button would lead to a form for these fields */}
           <Button variant="outline" disabled className="mt-2"><Edit3 className="mr-2 h-4 w-4" />Edit Profile (Coming Soon)</Button>
        </CardContent>
      </Card>
      
      {/* Medical Information Section */}
      <Card className="shadow-md" id="medical">
        <CardHeader>
          <CardTitle className="text-xl">Medical Information</CardTitle>
          <CardDescription>This information is stored securely and used only to provide you with personalized health insights. You control your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" value={user.allergies?.join(', ') || 'Not specified'} readOnly disabled className="bg-muted/30"/>
            </div>
            <div>
              <Label htmlFor="riskFactors">Known Risk Factors</Label>
              <Input id="riskFactors" value={user.riskFactors ? Object.entries(user.riskFactors).map(([k,v]) => `${k}: ${v}`).join('; ') : 'Not specified'} readOnly disabled className="bg-muted/30"/>
            </div>
            <Button variant="outline" disabled><Edit3 className="mr-2 h-4 w-4" />Update Medical Info (Coming Soon)</Button>
        </CardContent>
      </Card>

      {/* Health Goals Section */}
      <Card className="shadow-md" id="goals">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center gap-2"><Target className="h-6 w-6 text-primary"/>Health Goals</CardTitle>
            <CardDescription>Track and manage your personal health objectives.</CardDescription>
          </div>
          <Button onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Health Goal
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.healthGoals.length > 0 ? (
            user.healthGoals.map(goal => (
              <HealthGoalItem 
                key={goal.id} 
                goal={goal} 
                onUpdateGoalStatus={(goalId, status) => authUpdateHealthGoal({ ...user.healthGoals.find(g=>g.id===goalId)!, status})}
                onEditGoal={handleEditGoal}
                onDeleteGoal={handleDeleteGoal}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4 border border-dashed rounded-md">No health goals set yet. Click "+ Add New Health Goal" to start!</p>
          )}
        </CardContent>
      </Card>
      <HealthGoalModal 
        isOpen={isGoalModalOpen} 
        onClose={() => setIsGoalModalOpen(false)} 
        onSaveGoal={handleSaveGoal}
        goal={editingGoal}
      />

      {/* AI Feedback Preferences Section */}
      <Card className="shadow-md" id="ai-prefs">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><BellRing className="h-6 w-6 text-accent"/>AI Feedback Preferences</CardTitle>
          <CardDescription>Customize how VitaLog Pro interacts with you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
                <Label htmlFor="symptomDetail">Symptom Analysis Detail</Label>
                <Select 
                    value={currentAiPreferences?.symptomExplainabilityLevel}
                    onValueChange={(value) => handleAiPreferenceChange('symptomExplainabilityLevel', value)}
                >
                <SelectTrigger id="symptomDetail">
                    <SelectValue placeholder="Select detail level" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="brief">Brief</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="nudgeFrequency">Nudge Frequency</Label>
                <Select
                    value={currentAiPreferences?.nudgeFrequency}
                    onValueChange={(value) => handleAiPreferenceChange('nudgeFrequency', value)}
                >
                <SelectTrigger id="nudgeFrequency">
                    <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy Section */}
      <Card className="shadow-md" id="privacy">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-muted-foreground"/>Data & Privacy</CardTitle>
          <CardDescription>Manage your data and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <Button variant="link" className="p-0 h-auto text-primary block">View Privacy Policy</Button>
            <Button variant="link" className="p-0 h-auto text-primary block">Manage Your Data Consent</Button>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" disabled><Download className="mr-2 h-4 w-4"/>Request Data Export (Coming Soon)</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled><Trash2 className="mr-2 h-4 w-4"/>Request Account Deletion (Coming Soon)</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => toast({title: "Deletion Requested", description: "Your account deletion request has been submitted (mock)."})}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Logout Section */}
      <Card className="shadow-md">
        <CardContent className="p-6">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full"><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                        "Health is a state of body. Wellness is a state of being." – J. Stanford
                        <br/><br/>Are you sure you want to log out?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Stay Logged In</AlertDialogCancel>
                    <AlertDialogAction onClick={logout}>Logout</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
