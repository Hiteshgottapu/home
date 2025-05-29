
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
import { auth, db } from '@/lib/firebase'; // Ensure db is correctly imported
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

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
  fetchHealthGoals: () => Promise<void>; // Added for completeness if needed
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

  const fetchUserProfileData = useCallback(async (user: FirebaseUser): Promise<UserProfile | null> => {
    if (!db) {
      console.error("AuthContext (fetchUserProfileData): Firestore instance (db) is not available.");
      return null;
    }
    const userDocRef = doc(db, "users", user.uid);
    console.log(`AuthContext (fetchUserProfileData): Fetching profile for user ${user.uid}`);
    try {
      const userDocSnap = await getDoc(userDocRef);
      let profileData: UserProfile;

      if (userDocSnap.exists()) {
        console.log(`AuthContext (fetchUserProfileData): Profile found for user ${user.uid}.`);
        profileData = userDocSnap.data() as UserProfile;
        if (!profileData.healthGoals) profileData.healthGoals = [];
        profileData.aiFeedbackPreferences = { ...initialDefaultAiPreferences, ...(profileData.aiFeedbackPreferences || {}) };

      } else {
        console.log(`AuthContext (fetchUserProfileData): No profile found for user ${user.uid}. Creating new profile.`);
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
        console.log(`AuthContext (fetchUserProfileData): New profile created in Firestore for user ${user.uid}.`);
      }
      return profileData;
    } catch (error) {
        console.error("AuthContext (fetchUserProfileData): Error fetching/creating user profile in Firestore:", error);
        return null;
    }
  }, []);


  useEffect(() => {
    let userProfileUnsubscribe: Unsubscribe | undefined;
    let healthGoalsUnsubscribe: Unsubscribe | undefined;

    console.log("AuthContext (useEffect): Setting up onAuthStateChanged listener.");
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext (onAuthStateChanged): Auth state changed. User UID:", user ? user.uid : 'null');
      setIsLoading(true);

      if (userProfileUnsubscribe) {
        console.log("AuthContext (onAuthStateChanged): Unsubscribing from previous user profile listener.");
        userProfileUnsubscribe();
      }
      if (healthGoalsUnsubscribe) {
        console.log("AuthContext (onAuthStateChanged): Unsubscribing from previous health goals listener.");
        healthGoalsUnsubscribe();
      }

      if (user) {
        setFirebaseUser(user);
        const profile = await fetchUserProfileData(user);
        setUserProfile(profile);

        if (profile && db) {
            const userDocRef = doc(db, "users", user.uid);
            console.log(`AuthContext (onAuthStateChanged): Subscribing to profile changes for user ${user.uid}`);
            userProfileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedProfile = docSnap.data() as UserProfile;
                    setUserProfile(prev => ({
                        ...(prev || updatedProfile),
                        ...updatedProfile,
                         aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(updatedProfile.aiFeedbackPreferences || {}) },
                    }));
                    console.log(`AuthContext (onSnapshot userDoc): Profile updated for user ${user.uid}.`);
                } else {
                     console.warn(`AuthContext (onSnapshot userDoc): Profile doc for ${user.uid} disappeared.`);
                     setUserProfile(null);
                }
            }, (error) => {
                console.error(`AuthContext (onSnapshot userDoc): Error listening to user profile for ${user.uid}:`, error);
                setUserProfile(null);
            });

            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description"));
            console.log(`AuthContext (onAuthStateChanged): Subscribing to health goals for user ${user.uid}`);
            healthGoalsUnsubscribe = onSnapshot(q, (snapshot) => {
                const goals: HealthGoal[] = [];
                snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() } as HealthGoal));
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: goals } : null);
                console.log(`AuthContext (onSnapshot healthGoals): Health goals updated for user ${user.uid}. Count: ${goals.length}`);
            }, (error) => {
                console.error(`AuthContext (onSnapshot healthGoals): Error listening to health goals for ${user.uid}:`, error);
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: [] } : null);
            });
        } else if (!profile) {
            console.warn(`AuthContext (onAuthStateChanged): No profile fetched for user ${user.uid}, Firestore listeners not set up.`);
        }

      } else {
        console.log("AuthContext (onAuthStateChanged): User is signed out.");
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
      console.log(`AuthContext (onAuthStateChanged): Processing complete. isLoading: false. isAuthenticated: ${!!user && !!userProfile}`);
    });

    return () => {
      console.log("AuthContext (useEffect cleanup): Cleaning up onAuthStateChanged listener and Firestore subscriptions.");
      authUnsubscribe();
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
    };
  }, [fetchUserProfileData]);


  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    console.log(`AuthContext (signUpWithEmailPassword): Attempting sign up for email: ${email}, name: ${name}`);
    setIsLoading(true);
    if (!auth || !db) {
      console.error("AuthContext (signUpWithEmailPassword): Auth or DB not initialized.");
      setIsLoading(false);
      throw new Error("Signup service not available. Please try again later.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log(`AuthContext (signUpWithEmailPassword): Firebase user CREATED. UID: ${userCredential.user.uid}`);

      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: name });
        console.log(`AuthContext (signUpWithEmailPassword): Firebase profile display name UPDATED for UID: ${userCredential.user.uid}.`);

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
        console.log(`AuthContext (signUpWithEmailPassword): Firestore profile document CREATED for UID: ${userCredential.user.uid}.`);
      }
      // onAuthStateChanged will handle setting firebaseUser and userProfile globally.
      console.log("AuthContext (signUpWithEmailPassword): Sign up successful. Waiting for onAuthStateChanged to finalize state.");
      // Let onAuthStateChanged handle final isLoading state.
      return true;
    } catch (error: any) {
      console.error(`AuthContext (signUpWithEmailPassword): Error during sign up for ${email}. Code: ${error.code}, Message: ${error.message}`, error);
      setIsLoading(false); // Ensure loading is set to false on error
      throw error; // Re-throw for the UI component to handle (e.g., show specific error toast)
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    console.log(`AuthContext (loginWithEmailPassword): Attempting login for email: ${email}`);
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext (loginWithEmailPassword): Auth not initialized.");
      setIsLoading(false);
      // It's better to throw an error if auth isn't available, caught by calling component
      throw new Error("AuthContext: Authentication service not available.");
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting firebaseUser, userProfile, and final isLoading.
      console.log(`AuthContext (loginWithEmailPassword): Firebase signInWithEmailAndPassword SUCCEEDED for ${email}. Waiting for onAuthStateChanged.`);
      // Let onAuthStateChanged handle final isLoading state.
      return true;
    } catch (error: any) {
      console.error(`AuthContext (loginWithEmailPassword): Firebase signInWithEmailAndPassword FAILED for ${email}. Code: ${error.code}, Message: ${error.message}. Firebase error object:`, error);
      setIsLoading(false);
      return false; // Indicate failure to the calling component for generic error message
    }
  };

  const logout = async () => {
    console.log("AuthContext (logout): Attempting logout.");
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext (logout): Auth not initialized.");
      setIsLoading(false);
      return;
    }
    try {
      await signOut(auth);
      console.log("AuthContext (logout): Logout successful. Waiting for onAuthStateChanged to clear user state.");
      // onAuthStateChanged will set firebaseUser and userProfile to null
    } catch (error) {
      console.error("AuthContext (logout): Logout error:", error);
      setIsLoading(false); // Ensure loading is false if signOut itself errors
    }
  };

  const updateUserProfileState = async (updatedProfileData: Partial<UserProfile>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext (updateUserProfileState): Cannot update. User not authenticated, DB not available, or profile not loaded.");
      return;
    }
    console.log(`AuthContext (updateUserProfileState): Attempting to update Firestore profile for ${firebaseUser.uid}.`);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const { healthGoals, ...profileToUpdate } = updatedProfileData;
      await updateDoc(userDocRef, profileToUpdate);
      console.log(`AuthContext (updateUserProfileState): Firestore profile updated for user ${firebaseUser.uid}.`);
    } catch (error) {
      console.error(`AuthContext (updateUserProfileState): Error updating Firestore profile for ${firebaseUser.uid}:`, error);
    }
  };

  const addHealthGoal = async (goalData: Omit<HealthGoal, 'id' | 'userId'>): Promise<HealthGoal | null> => {
    if (!firebaseUser || !db) {
      console.warn("AuthContext (addHealthGoal): Cannot add. User not authenticated or DB not available.");
      return null;
    }
    console.log(`AuthContext (addHealthGoal): Adding health goal for user ${firebaseUser.uid}.`);
    try {
      const goalsColRef = collection(db, `users/${firebaseUser.uid}/healthGoals`);
      const newGoalData = { ...goalData, userId: firebaseUser.uid };
      const docRef = await addDoc(goalsColRef, newGoalData);
      console.log(`AuthContext (addHealthGoal): Health goal added for user ${firebaseUser.uid} with ID ${docRef.id}.`);
      return { id: docRef.id, ...newGoalData };
    } catch (error) {
      console.error(`AuthContext (addHealthGoal): Error adding health goal for ${firebaseUser.uid}:`, error);
      return null;
    }
  };

  const updateHealthGoal = async (updatedGoal: HealthGoal) => {
    if (!firebaseUser || !db || !updatedGoal.id) {
      console.warn("AuthContext (updateHealthGoal): Cannot update. Invalid parameters.");
      return;
    }
     console.log(`AuthContext (updateHealthGoal): Updating health goal ID ${updatedGoal.id} for user ${firebaseUser.uid}.`);
    try {
      const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, updatedGoal.id);
      const { id, userId, ...dataToUpdate } = updatedGoal;
      await updateDoc(goalDocRef, dataToUpdate);
      console.log(`AuthContext (updateHealthGoal): Health goal updated for user ${firebaseUser.uid}, goal ID ${id}.`);
    } catch (error) {
      console.error(`AuthContext (updateHealthGoal): Error updating health goal for ${firebaseUser.uid}, goal ID ${updatedGoal.id}:`, error);
    }
  };

  const deleteHealthGoal = async (goalId: string) => {
    if (!firebaseUser || !db) {
      console.warn("AuthContext (deleteHealthGoal): Cannot delete. User not authenticated or DB not available.");
      return;
    }
    console.log(`AuthContext (deleteHealthGoal): Deleting health goal ID ${goalId} for user ${firebaseUser.uid}.`);
    try {
        const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, goalId);
        await deleteDoc(goalDocRef);
        console.log(`AuthContext (deleteHealthGoal): Health goal deleted for user ${firebaseUser.uid}, goal ID ${goalId}.`);
    } catch (error) {
        console.error(`AuthContext (deleteHealthGoal): Error deleting health goal for ${firebaseUser.uid}, goal ID ${goalId}:`, error);
    }
  };

  const updateAiPreferences = async (preferences: Partial<AiFeedbackPreferences>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext (updateAiPreferences): Cannot update. Invalid parameters or profile not loaded.");
      return;
    }
    console.log(`AuthContext (updateAiPreferences): Updating AI preferences for user ${firebaseUser.uid}.`);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      console.log(`AuthContext (updateAiPreferences): AI preferences updated in Firestore for user ${firebaseUser.uid}.`);
    } catch (error) {
      console.error(`AuthContext (updateAiPreferences): Error updating AI preferences for ${firebaseUser.uid}:`, error);
    }
  };

  const fetchHealthGoals = useCallback(async () => {
    if (!firebaseUser || !db) {
        console.warn("AuthContext (fetchHealthGoals): Cannot fetch. User not authenticated or DB not available.");
        return;
    }
    console.log(`AuthContext (fetchHealthGoals): Explicit fetchHealthGoals called for ${firebaseUser.uid}. Relying on onSnapshot primarily.`);
  }, [firebaseUser]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!firebaseUser && !!userProfile,
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
