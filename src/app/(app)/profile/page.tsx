
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, ShieldCheck, Target, BellRing, PlusCircle, Edit3, Download, LogOut, Trash2, Loader2 } from 'lucide-react';
import { HealthGoalItem } from '@/components/profile/HealthGoalItem';
import { HealthGoalModal } from '@/components/profile/HealthGoalModal';
import type { HealthGoal, AiFeedbackPreferences, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { userProfile, addHealthGoal, updateHealthGoal, deleteHealthGoal: authDeleteHealthGoal, updateAiPreferences, logout, isLoading: authIsLoading, healthGoals } = useAuth();
  const { toast } = useToast();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);
  const [currentAiPreferences, setCurrentAiPreferences] = useState<AiFeedbackPreferences | undefined>(undefined);
  
  useEffect(() => {
    if (userProfile && !authIsLoading) {
      setCurrentAiPreferences(userProfile.aiFeedbackPreferences);
    }
  }, [userProfile, authIsLoading]);


  const handleSaveGoal = async (goalData: Omit<HealthGoal, 'id' | 'userId'> | HealthGoal) => {
    try {
      if ('id' in goalData) { // Editing existing goal
        await updateHealthGoal(goalData);
        toast({ title: "Goal Updated", description: `"${goalData.description}" has been updated.` });
      } else { // Adding new goal
        await addHealthGoal(goalData);
        toast({ title: "Goal Added", description: `New goal "${goalData.description}" created.` });
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      toast({ title: "Error Saving Goal", description: "Could not save your health goal.", variant: "destructive"});
    }
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  const handleEditGoal = (goal: HealthGoal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await authDeleteHealthGoal(goalId);
      toast({ title: "Goal Deleted", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({ title: "Error Deleting Goal", description: "Could not delete your health goal.", variant: "destructive"});
    }
  };

  const handleAiPreferenceChange = async (key: keyof AiFeedbackPreferences, value: string) => {
    if (userProfile && currentAiPreferences) {
      const newPrefs = { ...currentAiPreferences, [key]: value };
      setCurrentAiPreferences(newPrefs); 
      try {
        await updateAiPreferences(newPrefs);
        toast({ title: "AI Preferences Updated" });
      } catch (error) {
        console.error("Error updating AI preferences:", error);
        toast({ title: "Update Failed", description: "Could not save AI preferences.", variant: "destructive"});
        setCurrentAiPreferences(userProfile.aiFeedbackPreferences);
      }
    }
  };

  if (authIsLoading && !userProfile) {
    return (
      <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        {[...Array(5)].map((_, i) => (
            <Card key={i} className="shadow-md mb-6">
                <CardHeader>
                    <Skeleton className="h-8 w-1/3 mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-1/4 mt-3" />
                </CardContent>
            </Card>
        ))}
      </div>
    );
  }

  if (!userProfile) {
    return <div className="text-center py-10">No user profile found. Please try logging in again or wait a moment.</div>;
  }
  
  const aiPrefsToUse = currentAiPreferences || userProfile.aiFeedbackPreferences;


  return (
    <div className="container mx-auto py-2 px-0 md:px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <UserCog className="h-8 w-8" /> Profile & Settings
        </h1>
        <p className="text-muted-foreground">Manage your personal information, health goals, and preferences.</p>
      </div>

      <Card className="shadow-md" id="details">
        <CardHeader>
          <CardTitle className="text-xl">Personal Details</CardTitle>
          <CardDescription>This information is kept secure and private.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={userProfile.name} readOnly disabled className="bg-muted/30"/>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={userProfile.phoneNumber || 'Not provided'} readOnly disabled className="bg-muted/30"/>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={userProfile.email || 'Not provided'} readOnly disabled className="bg-muted/30"/>
            </div>
             <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" value={userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString() : 'Not provided'} readOnly disabled className="bg-muted/30"/>
            </div>
          </div>
           <Button variant="outline" disabled className="mt-2 transition-all duration-300 active:scale-95"><Edit3 className="mr-2 h-4 w-4" />Edit Profile (Coming Soon)</Button>
        </CardContent>
      </Card>

      <Card className="shadow-md" id="medical">
        <CardHeader>
          <CardTitle className="text-xl">Medical Information</CardTitle>
          <CardDescription>This information is stored securely and used only to provide you with personalized health insights. You control your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" value={userProfile.allergies?.join(', ') || 'Not specified'} readOnly disabled className="bg-muted/30"/>
            </div>
            <div>
              <Label htmlFor="riskFactors">Known Risk Factors</Label>
              <Input id="riskFactors" value={userProfile.riskFactors && Object.keys(userProfile.riskFactors).length > 0 ? Object.entries(userProfile.riskFactors).map(([k,v]) => `${k}: ${v}`).join('; ') : 'Not specified'} readOnly disabled className="bg-muted/30"/>
            </div>
            <Button variant="outline" disabled className="transition-all duration-300 active:scale-95"><Edit3 className="mr-2 h-4 w-4" />Update Medical Info (Coming Soon)</Button>
        </CardContent>
      </Card>

      <Card className="shadow-md" id="goals">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center gap-2"><Target className="h-6 w-6 text-primary"/>Health Goals</CardTitle>
            <CardDescription>Track and manage your personal health objectives.</CardDescription>
          </div>
          <Button onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }} className="transition-all duration-300 active:scale-95">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Health Goal
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {authIsLoading && healthGoals.length === 0 ? ( 
             <div className="space-y-3">
                {[...Array(2)].map((_, i) => 
                  <Card key={i} className="w-full shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Skeleton className="h-5 w-5 rounded-sm" />
                            <div className="flex-1 min-w-0 space-y-1">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </CardContent>
                  </Card>
                )}
             </div>
          ) : healthGoals.length > 0 ? (
            healthGoals.map(goal => (
              <HealthGoalItem
                key={goal.id}
                goal={goal}
                onUpdateGoalStatus={(goalId, status) => updateHealthGoal({ ...healthGoals.find(g=>g.id===goalId)!, status})}
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
                    value={aiPrefsToUse.symptomExplainabilityLevel}
                    onValueChange={(value) => handleAiPreferenceChange('symptomExplainabilityLevel', value)}
                    disabled={authIsLoading}
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
                    value={aiPrefsToUse.nudgeFrequency}
                    onValueChange={(value) => handleAiPreferenceChange('nudgeFrequency', value)}
                    disabled={authIsLoading}
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

      <Card className="shadow-md" id="privacy">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-muted-foreground"/>Data & Privacy</CardTitle>
          <CardDescription>Manage your data and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <Button variant="link" className="p-0 h-auto text-primary block">View Privacy Policy</Button>
            <Button variant="link" className="p-0 h-auto text-primary block">Manage Your Data Consent</Button>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" disabled className="transition-all duration-300 active:scale-95"><Download className="mr-2 h-4 w-4"/>Request Data Export (Coming Soon)</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled className="transition-all duration-300 active:scale-95"><Trash2 className="mr-2 h-4 w-4"/>Request Account Deletion (Coming Soon)</Button>
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

      <Card className="shadow-md">
        <CardContent className="p-6">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full transition-all duration-300 active:scale-95" disabled={authIsLoading}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
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
