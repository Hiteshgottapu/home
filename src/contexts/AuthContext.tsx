
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
import { doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null; 
  userProfile: UserProfile | null; 
  signUpWithEmailPassword: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfileState: (updatedProfileData: Partial<UserProfile>) => void; 
  addHealthGoal: (goalData: Omit<HealthGoal, 'id' | 'userId'>) => Promise<HealthGoal | null>;
  updateHealthGoal: (updatedGoal: HealthGoal) => Promise<void>;
  deleteHealthGoal: (goalId: string) => Promise<void>;
  updateAiPreferences: (preferences: Partial<AiFeedbackPreferences>) => Promise<void>;
  fetchHealthGoals: () => Promise<void>; 
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
      setIsLoading(false);
      return null;
    }
    const userDocRef = doc(db, "users", user.uid);
    
    try {
      const userDocSnap = await getDoc(userDocRef);
      let profileData: UserProfile;

      if (userDocSnap.exists()) {
        profileData = userDocSnap.data() as UserProfile;
        if (!profileData.healthGoals) profileData.healthGoals = [];
        if (!profileData.aiFeedbackPreferences) profileData.aiFeedbackPreferences = { ...initialDefaultAiPreferences, ...profileData.aiFeedbackPreferences };
      } else {
        profileData = {
          id: user.uid,
          email: user.email || undefined,
          name: user.displayName || 'New User',
          healthGoals: [],
          aiFeedbackPreferences: { ...initialDefaultAiPreferences },
          dateOfBirth: undefined,
          allergies: [],
          riskFactors: {},
        };
        await setDoc(userDocRef, profileData);
      }
      return profileData;
    } catch (error) {
        console.error("Error fetching/creating user profile:", error);
        setIsLoading(false);
        return null;
    }
  }, []);
  
  const fetchHealthGoalsForUser = useCallback(async (userId: string): Promise<HealthGoal[]> => {
    if (!db) {
      console.error("Firestore instance (db) is not available for fetching goals.");
      return [];
    }
    const goalsColRef = collection(db, `users/${userId}/healthGoals`);
    const q = query(goalsColRef, orderBy("description")); 
    try {
        const goalsSnapshot = await getDocs(q);
        const goals: HealthGoal[] = [];
        goalsSnapshot.forEach((doc) => {
        goals.push({ id: doc.id, ...doc.data() } as HealthGoal);
        });
        return goals;
    } catch (error) {
        console.error("Error fetching health goals:", error);
        return [];
    }
  }, []);


  useEffect(() => {
    let userProfileUnsubscribe: Unsubscribe | undefined;
    let healthGoalsUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      // Clean up previous listeners
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();

      if (user) {
        setFirebaseUser(user);
        
        // Listen for user profile changes
        if (db) {
            const userDocRef = doc(db, "users", user.uid);
            userProfileUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const profile = docSnap.data() as UserProfile;
                     // Ensure healthGoals and aiFeedbackPreferences are initialized if not present
                    if (!profile.healthGoals) profile.healthGoals = []; // This will be overwritten by healthGoals listener below
                    if (!profile.aiFeedbackPreferences) profile.aiFeedbackPreferences = {...initialDefaultAiPreferences, ...profile.aiFeedbackPreferences};
                    setUserProfile(profile); // Set base profile first
                } else {
                    // Create profile if it doesn't exist (should ideally be rare if signup creates it)
                    const newProfile = await fetchUserProfileData(user); // fetchUserProfileData creates if not exists
                    if (newProfile) setUserProfile(newProfile); else setUserProfile(null);
                }
            }, (error) => {
                console.error("Error listening to user profile:", error);
                setUserProfile(null);
            });

            // Listen for health goals changes
            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description"));
            healthGoalsUnsubscribe = onSnapshot(q, (snapshot) => {
                const goals: HealthGoal[] = [];
                snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() } as HealthGoal));
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: goals } : null);
            }, (error) => {
                console.error("Error listening to health goals:", error);
                 setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: [] } : null);
            });
        } else {
            setUserProfile(null);
        }

      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
    };
  }, [fetchUserProfileData]); // fetchUserProfileData is stable

  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    if (!auth || !db) {
        console.error("Auth or DB not initialized for signup");
        setIsLoading(false);
        return false;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: name });
        // Create user profile document immediately after signup
        const newUserProfile: UserProfile = {
            id: userCredential.user.uid,
            email: userCredential.user.email || undefined,
            name: name,
            healthGoals: [],
            aiFeedbackPreferences: { ...initialDefaultAiPreferences },
            dateOfBirth: undefined,
            allergies: [],
            riskFactors: {},
        };
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, newUserProfile);
        // onAuthStateChanged will pick up the new user, and onSnapshot for user profile will provide it
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
      console.error("Auth not initialized for login");
      setIsLoading(false);
      return false;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged and onSnapshot listeners will handle setting user and profile
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Firebase signInWithEmailAndPassword error:", error);
      setIsLoading(false);
      return false; // Return false on error instead of re-throwing
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (!auth) return;
    try {
      await signOut(auth);
      // firebaseUser and userProfile will be set to null by onAuthStateChanged listener
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
      const { healthGoals, ...profileToUpdate } = updatedProfileData; 
      await updateDoc(userDocRef, profileToUpdate);
      // setUserProfile(prev => prev ? { ...prev, ...profileToUpdate } : null); // Handled by onSnapshot
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
      const newGoalData = { ...goalData, userId: firebaseUser.uid }; // Ensure userId is set
      const docRef = await addDoc(goalsColRef, newGoalData);
      // No need to update local state, onSnapshot will handle it
      return { id: docRef.id, ...newGoalData };
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
      const { id, userId, ...dataToUpdate } = updatedGoal; 
      await updateDoc(goalDocRef, dataToUpdate);
      // No need to update local state, onSnapshot will handle it
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
        // No need to update local state, onSnapshot will handle it
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
      // No need to update local state, onSnapshot will handle it
    } catch (error) {
      console.error("Error updating AI preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // This function might become less necessary if onSnapshot covers all goal updates.
  // Kept for now if an explicit refresh button or action is desired.
  const fetchHealthGoals = useCallback(async () => {
    if (!firebaseUser || !db || !userProfile) return; // Check for db
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

