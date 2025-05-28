
"use client";
import type { UserProfile, HealthGoal, AiFeedbackPreferences } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null; 
  userProfile: UserProfile | null; 
  signUpWithEmailPassword: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfileState: (updatedProfileData: Partial<UserProfile>) => void; // May deprecate if profile fields are managed individually
  addHealthGoal: (goalData: Omit<HealthGoal, 'id' | 'userId'>) => Promise<HealthGoal | null>;
  updateHealthGoal: (updatedGoal: HealthGoal) => Promise<void>;
  deleteHealthGoal: (goalId: string) => Promise<void>;
  updateAiPreferences: (preferences: Partial<AiFeedbackPreferences>) => Promise<void>;
  fetchHealthGoals: () => Promise<void>; // To refresh goals
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialDefaultAiPreferences: AiFeedbackPreferences = {
  symptomExplainabilityLevel: 'brief',
  nudgeFrequency: 'medium',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfileData = useCallback(async (user: FirebaseUser) => {
    if (!db) {
      console.error("Firestore instance (db) is not available.");
      return null;
    }
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    let profileData: UserProfile;

    if (userDocSnap.exists()) {
      profileData = userDocSnap.data() as UserProfile;
      // Ensure healthGoals and aiFeedbackPreferences are initialized if not present from DB
      if (!profileData.healthGoals) profileData.healthGoals = [];
      if (!profileData.aiFeedbackPreferences) profileData.aiFeedbackPreferences = initialDefaultAiPreferences;

    } else {
      // Create a new profile in Firestore if it doesn't exist
      profileData = {
        id: user.uid,
        email: user.email || undefined,
        name: user.displayName || 'New User',
        healthGoals: [],
        aiFeedbackPreferences: initialDefaultAiPreferences,
        // Initialize other fields as needed
        dateOfBirth: undefined,
        allergies: [],
        riskFactors: {},
      };
      await setDoc(userDocRef, profileData);
    }
    return profileData;
  }, []);
  
  const fetchHealthGoalsForUser = useCallback(async (userId: string): Promise<HealthGoal[]> => {
    if (!db) {
      console.error("Firestore instance (db) is not available for fetching goals.");
      return [];
    }
    const goalsColRef = collection(db, `users/${userId}/healthGoals`);
    const q = query(goalsColRef, orderBy("description")); // Or some other field like a creation timestamp
    const goalsSnapshot = await getDocs(q);
    const goals: HealthGoal[] = [];
    goalsSnapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as HealthGoal);
    });
    return goals;
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setFirebaseUser(user);
        const profile = await fetchUserProfileData(user);
        if (profile) {
          const healthGoals = await fetchHealthGoalsForUser(user.uid);
          setUserProfile({ ...profile, healthGoals });
        } else {
          setUserProfile(null); // Should not happen if fetchUserProfileData creates one
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfileData, fetchHealthGoalsForUser]);

  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    if (!auth || !db) throw new Error("Auth or DB not initialized");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: name });
        // The onAuthStateChanged listener will handle fetching/creating the profile
      }
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error signing up:", error);
      setIsLoading(false);
      throw error; 
    }
  };
  
  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    if (!auth) throw new Error("Auth not initialized");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and profile
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error logging in:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/auth/login'); 
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserProfileState = async (updatedProfileData: Partial<UserProfile>) => {
    if (!firebaseUser || !db || !userProfile) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      // We only update fields that are directly on the user profile doc, not subcollections like healthGoals
      const { healthGoals, ...profileToUpdate } = updatedProfileData; // Exclude healthGoals
      await updateDoc(userDocRef, profileToUpdate);
      setUserProfile(prev => prev ? { ...prev, ...profileToUpdate } : null);
    } catch (error) {
      console.error("Error updating user profile in Firestore:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addHealthGoal = async (goalData: Omit<HealthGoal, 'id' | 'userId'>): Promise<HealthGoal | null> => {
    if (!firebaseUser || !db) return null;
    setIsLoading(true);
    try {
      const goalsColRef = collection(db, `users/${firebaseUser.uid}/healthGoals`);
      const newGoalData = { ...goalData, userId: firebaseUser.uid };
      const docRef = await addDoc(goalsColRef, newGoalData);
      const newGoal = { id: docRef.id, ...newGoalData };
      setUserProfile(prev => prev ? { ...prev, healthGoals: [...prev.healthGoals, newGoal] } : null);
      return newGoal;
    } catch (error) {
      console.error("Error adding health goal:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateHealthGoal = async (updatedGoal: HealthGoal) => {
    if (!firebaseUser || !db || !updatedGoal.id) return;
    setIsLoading(true);
    try {
      const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, updatedGoal.id);
      const { id, userId, ...dataToUpdate } = updatedGoal; // Don't store id/userId inside the doc itself again if not needed
      await updateDoc(goalDocRef, dataToUpdate);
      setUserProfile(prev => {
        if (!prev) return null;
        const updatedGoals = prev.healthGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
        return { ...prev, healthGoals: updatedGoals };
      });
    } catch (error) {
      console.error("Error updating health goal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHealthGoal = async (goalId: string) => {
    if (!firebaseUser || !db) return;
    setIsLoading(true);
    try {
        const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, goalId);
        await deleteDoc(goalDocRef);
        setUserProfile(prev => {
            if (!prev) return null;
            const updatedGoals = prev.healthGoals.filter(g => g.id !== goalId);
            return { ...prev, healthGoals: updatedGoals };
        });
    } catch (error) {
        console.error("Error deleting health goal:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const updateAiPreferences = async (preferences: Partial<AiFeedbackPreferences>) => {
    if (!firebaseUser || !db || !userProfile) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      setUserProfile(prev => prev ? { ...prev, aiFeedbackPreferences: newAiPreferences } : null);
    } catch (error) {
      console.error("Error updating AI preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchHealthGoals = useCallback(async () => {
    if (!firebaseUser || !userProfile) return;
    setIsLoading(true);
    const goals = await fetchHealthGoalsForUser(firebaseUser.uid);
    setUserProfile(prev => prev ? { ...prev, healthGoals: goals } : null);
    setIsLoading(false);
  }, [firebaseUser, userProfile, fetchHealthGoalsForUser]);


  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!firebaseUser, 
      firebaseUser, 
      userProfile, 
      signUpWithEmailPassword,
      loginWithEmailPassword, 
      logout, 
      isLoading, 
      updateUserProfileState, 
      addHealthGoal, 
      updateHealthGoal, 
      deleteHealthGoal,
      updateAiPreferences,
      fetchHealthGoals
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    