
"use client";
import type { UserProfile, HealthGoal, AiFeedbackPreferences } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser, signOut, ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'; // Added signInWithPhoneNumber
import { auth } from '@/lib/firebase'; 

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null; 
  userProfile: UserProfile | null; 
  loginWithPhoneNumber: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfileState: (updatedProfileData: Partial<UserProfile>) => void;
  addHealthGoal: (goal: Omit<HealthGoal, 'id'>) => void;
  updateHealthGoal: (updatedGoal: HealthGoal) => void;
  updateAiPreferences: (preferences: Partial<AiFeedbackPreferences>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialMockUserProfileData: Omit<UserProfile, 'id' | 'phoneNumber' | 'email'> = {
  name: 'New User', 
  dateOfBirth: undefined,
  allergies: [],
  riskFactors: {},
  aiFeedbackPreferences: {
    symptomExplainabilityLevel: 'brief',
    nudgeFrequency: 'medium',
  },
  healthGoals: [],
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setFirebaseUser(user);
        const storedUserProfile = localStorage.getItem(`vitaLogProUser_${user.uid}`);
        if (storedUserProfile) {
          setUserProfile(JSON.parse(storedUserProfile));
        } else {
          const newUserProfile: UserProfile = {
            id: user.uid,
            phoneNumber: user.phoneNumber || undefined,
            email: user.email || undefined,
            ...initialMockUserProfileData,
            name: user.displayName || user.phoneNumber || 'New User',
          };
          setUserProfile(newUserProfile);
          localStorage.setItem(`vitaLogProUser_${user.uid}`, JSON.stringify(newUserProfile));
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithPhoneNumber = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setIsLoading(true);
    try {
      // Use signInWithPhoneNumber from firebase/auth directly
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setIsLoading(false);
      return confirmationResult;
    } catch (error) {
      console.error("Error sending OTP:", error);
      setIsLoading(false);
      throw error; 
    }
  };

  const confirmOtp = async (confirmationResult: ConfirmationResult, otp: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error confirming OTP:", error);
      setIsLoading(false);
      throw error;
    }
  };


  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      router.push('/auth/login');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserProfileState = (updatedProfileData: Partial<UserProfile>) => {
    setUserProfile(prevUserProfile => {
      if (!prevUserProfile || !firebaseUser) return null;
      const newUserProfile = { ...prevUserProfile, ...updatedProfileData };
      localStorage.setItem(`vitaLogProUser_${firebaseUser.uid}`, JSON.stringify(newUserProfile));
      return newUserProfile;
    });
  };

  const addHealthGoal = (goal: Omit<HealthGoal, 'id'>) => {
    setUserProfile(prevUserProfile => {
      if (!prevUserProfile || !firebaseUser) return null;
      const newGoal = { ...goal, id: `goal${Date.now()}` };
      const updatedGoals = [...prevUserProfile.healthGoals, newGoal];
      const newUserProfile = { ...prevUserProfile, healthGoals: updatedGoals };
      localStorage.setItem(`vitaLogProUser_${firebaseUser.uid}`, JSON.stringify(newUserProfile));
      return newUserProfile;
    });
  };
  
  const updateHealthGoal = (updatedGoal: HealthGoal) => {
    setUserProfile(prevUserProfile => {
      if (!prevUserProfile || !firebaseUser) return null;
      const updatedGoals = prevUserProfile.healthGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
      const newUserProfile = { ...prevUserProfile, healthGoals: updatedGoals };
      localStorage.setItem(`vitaLogProUser_${firebaseUser.uid}`, JSON.stringify(newUserProfile));
      return newUserProfile;
    });
  };

  const updateAiPreferences = (preferences: Partial<AiFeedbackPreferences>) => {
    setUserProfile(prevUserProfile => {
      if(!prevUserProfile || !firebaseUser) return null;
      const newPreferences = { ...(prevUserProfile.aiFeedbackPreferences || initialMockUserProfileData.aiFeedbackPreferences), ...preferences };
      const newUserProfile = { ...prevUserProfile, aiFeedbackPreferences: newPreferences };
      localStorage.setItem(`vitaLogProUser_${firebaseUser.uid}`, JSON.stringify(newUserProfile));
      return newUserProfile;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!firebaseUser, 
      firebaseUser, 
      userProfile, 
      loginWithPhoneNumber, 
      confirmOtp,
      logout, 
      isLoading, 
      updateUserProfileState, 
      addHealthGoal, 
      updateHealthGoal, 
      updateAiPreferences 
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
