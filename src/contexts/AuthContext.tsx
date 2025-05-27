
"use client";
import type { UserProfile, HealthGoal, AiFeedbackPreferences } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; 

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null; 
  userProfile: UserProfile | null; 
  signUpWithEmailPassword: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfileState: (updatedProfileData: Partial<UserProfile>) => void;
  addHealthGoal: (goal: Omit<HealthGoal, 'id'>) => void;
  updateHealthGoal: (updatedGoal: HealthGoal) => void;
  updateAiPreferences: (preferences: Partial<AiFeedbackPreferences>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialMockUserProfileData: Omit<UserProfile, 'id' | 'phoneNumber' | 'email' | 'name'> = {
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
          // For new users after signup, or if profile doesn't exist
          const newUserProfile: UserProfile = {
            id: user.uid,
            email: user.email || undefined,
            name: user.displayName || 'New User', // displayName might be set during signup
            ...initialMockUserProfileData,
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

  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    if (!auth) {
      console.error("Auth instance is not available for signup.");
      setIsLoading(false);
      throw new Error("Authentication service not initialized.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update Firebase user profile with name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        // Manually create and set local userProfile as onAuthStateChanged might be slightly delayed
        // or may not pick up displayName immediately for the very first profile creation.
        const newUserProfile: UserProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || undefined,
          name: name,
          ...initialMockUserProfileData,
        };
        setUserProfile(newUserProfile);
        localStorage.setItem(`vitaLogProUser_${userCredential.user.uid}`, JSON.stringify(newUserProfile));
        setFirebaseUser(userCredential.user); // Ensure firebaseUser state is also updated
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
    if (!auth) {
      console.error("Auth instance is not available for login.");
      setIsLoading(false);
      throw new Error("Authentication service not initialized.");
    }
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
    if (!auth) {
      console.error("Auth instance is not available for logout.");
      setIsLoading(false);
      return;
    }
    try {
      await signOut(auth);
      // onAuthStateChanged will clear user and profile
      router.push('/auth/login'); // Redirect to login after logout
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
      signUpWithEmailPassword,
      loginWithEmailPassword, 
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
