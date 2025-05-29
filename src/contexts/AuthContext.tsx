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
      console.error("AuthContext: Firestore instance (db) is not available for fetchUserProfileData.");
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
        console.log(`AuthContext: No profile found for user ${user.uid}. Creating new profile.`);
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
        console.log(`AuthContext: New profile created for user ${user.uid}.`);
      }
      return profileData;
    } catch (error) {
        console.error("AuthContext: Error fetching/creating user profile:", error);
        setIsLoading(false);
        return null;
    }
  }, []);

  useEffect(() => {
    let userProfileUnsubscribe: Unsubscribe | undefined;
    let healthGoalsUnsubscribe: Unsubscribe | undefined;

    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: onAuthStateChanged triggered. User:", user ? user.uid : 'null');
      setIsLoading(true);
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();

      if (user) {
        setFirebaseUser(user);

        if (db) {
            const userDocRef = doc(db, "users", user.uid);
            console.log(`AuthContext: Subscribing to profile for user ${user.uid}`);
            userProfileUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
                console.log(`AuthContext: Profile snapshot received for user ${user.uid}. Exists:`, docSnap.exists());
                if (docSnap.exists()) {
                    const profile = docSnap.data() as UserProfile;
                    if (!profile.healthGoals) profile.healthGoals = [];
                    if (!profile.aiFeedbackPreferences) profile.aiFeedbackPreferences = {...initialDefaultAiPreferences, ...profile.aiFeedbackPreferences};
                    setUserProfile(profile);
                } else {
                    console.warn(`AuthContext: Profile doc doesn't exist for ${user.uid} during onSnapshot. Attempting to fetch/create.`);
                    const newProfile = await fetchUserProfileData(user); // Attempt to create if missing
                    if (newProfile) setUserProfile(newProfile); else setUserProfile(null);
                }
            }, (error) => {
                console.error(`AuthContext: Error listening to user profile for ${user.uid}:`, error);
                setUserProfile(null);
            });

            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description"));
            console.log(`AuthContext: Subscribing to health goals for user ${user.uid}`);
            healthGoalsUnsubscribe = onSnapshot(q, (snapshot) => {
                console.log(`AuthContext: Health goals snapshot received for user ${user.uid}. Count:`, snapshot.docs.length);
                const goals: HealthGoal[] = [];
                snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() } as HealthGoal));
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: goals } : null);
            }, (error) => {
                console.error(`AuthContext: Error listening to health goals for ${user.uid}:`, error);
                 setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: [] } : null);
            });
        } else {
            console.error("AuthContext: Firestore instance (db) is not available when user is authenticated.");
            setUserProfile(null);
        }

      } else {
        console.log("AuthContext: User is signed out.");
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
      console.log("AuthContext: setIsLoading(false) after auth state change processing.");
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener and Firestore subscriptions.");
      authUnsubscribe();
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
    };
  }, [fetchUserProfileData]);

  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    if (!auth || !db) {
        console.error("AuthContext: Auth or DB not initialized for signUpWithEmailPassword.");
        setIsLoading(false);
        throw new Error("Auth or DB not initialized");
    }
    try {
      console.log(`AuthContext: Attempting to create user with email: ${email}`);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log(`AuthContext: User created successfully: ${userCredential.user.uid}`);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: name });
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
        console.log(`AuthContext: Firestore profile created for new user: ${userCredential.user.uid}`);
      }
      // onAuthStateChanged will handle setting user and profile, then redirect
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error(`AuthContext: Error signing up user ${email}:`, error);
      setIsLoading(false);
      throw error; // Re-throw to be caught by UI component
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    if (!auth) {
        console.error("AuthContext: Auth not initialized for loginWithEmailPassword.");
        setIsLoading(false);
        // It's better to throw an error if auth isn't available, caught by calling component
        throw new Error("AuthContext: Authentication service not available.");
    }
    try {
      console.log(`AuthContext: Attempting to sign in user with email: ${email}`);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user, profile, and loading state.
      // Success means onAuthStateChanged will eventually set isLoading to false.
      // We can set it here too, but onAuthStateChanged is the primary handler.
      setIsLoading(false); 
      return true;
    } catch (error: any) {
      // Log the specific Firebase error
      console.error(`AuthContext: Firebase signInWithEmailAndPassword error for email ${email}. Error Code: ${error.code}. Message: ${error.message}. Full Error:`, error);
      setIsLoading(false);
      return false; // Indicate failure to the calling component
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext: Auth not initialized for logout.");
      setIsLoading(false);
      return;
    }
    try {
      console.log("AuthContext: Attempting to sign out user.");
      await signOut(auth);
      // onAuthStateChanged will set firebaseUser and userProfile to null
      // router.push is handled by the AppLayout and LoginPage components based on auth state.
      console.log("AuthContext: User signed out successfully.");
    } catch (error) {
      console.error("AuthContext: Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfileState = async (updatedProfileData: Partial<UserProfile>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext: Cannot update user profile state. User not authenticated, DB not available, or profile not loaded.");
      return;
    }
    // No need to set isLoading here as onSnapshot will update the UI
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const { healthGoals, ...profileToUpdate } = updatedProfileData; // healthGoals are managed separately
      await updateDoc(userDocRef, profileToUpdate);
      console.log(`AuthContext: User profile updated in Firestore for user ${firebaseUser.uid}.`);
    } catch (error) {
      console.error(`AuthContext: Error updating user profile in Firestore for ${firebaseUser.uid}:`, error);
    }
  };

  const addHealthGoal = async (goalData: Omit<HealthGoal, 'id' | 'userId'>): Promise<HealthGoal | null> => {
    if (!firebaseUser || !db) {
      console.warn("AuthContext: Cannot add health goal. User not authenticated or DB not available.");
      return null;
    }
    // No need to set isLoading here
    try {
      const goalsColRef = collection(db, `users/${firebaseUser.uid}/healthGoals`);
      const newGoalData = { ...goalData, userId: firebaseUser.uid };
      const docRef = await addDoc(goalsColRef, newGoalData);
      console.log(`AuthContext: Health goal added for user ${firebaseUser.uid} with ID ${docRef.id}.`);
      return { id: docRef.id, ...newGoalData }; // onSnapshot in useEffect will update the local state
    } catch (error) {
      console.error(`AuthContext: Error adding health goal for ${firebaseUser.uid}:`, error);
      return null;
    }
  };

  const updateHealthGoal = async (updatedGoal: HealthGoal) => {
    if (!firebaseUser || !db || !updatedGoal.id) {
      console.warn("AuthContext: Cannot update health goal. Invalid parameters.");
      return;
    }
    // No need to set isLoading here
    try {
      const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, updatedGoal.id);
      const { id, userId, ...dataToUpdate } = updatedGoal;
      await updateDoc(goalDocRef, dataToUpdate);
      console.log(`AuthContext: Health goal updated for user ${firebaseUser.uid}, goal ID ${id}.`);
    } catch (error) {
      console.error(`AuthContext: Error updating health goal for ${firebaseUser.uid}, goal ID ${updatedGoal.id}:`, error);
    }
  };

  const deleteHealthGoal = async (goalId: string) => {
    if (!firebaseUser || !db) {
      console.warn("AuthContext: Cannot delete health goal. User not authenticated or DB not available.");
      return;
    }
    // No need to set isLoading here
    try {
        const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, goalId);
        await deleteDoc(goalDocRef);
        console.log(`AuthContext: Health goal deleted for user ${firebaseUser.uid}, goal ID ${goalId}.`);
    } catch (error) {
        console.error(`AuthContext: Error deleting health goal for ${firebaseUser.uid}, goal ID ${goalId}:`, error);
    }
  };

  const updateAiPreferences = async (preferences: Partial<AiFeedbackPreferences>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext: Cannot update AI preferences. Invalid parameters.");
      return;
    }
    // No need to set isLoading here
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      console.log(`AuthContext: AI preferences updated for user ${firebaseUser.uid}.`);
    } catch (error) {
      console.error(`AuthContext: Error updating AI preferences for ${firebaseUser.uid}:`, error);
    }
  };

  const fetchHealthGoals = useCallback(async () => {
    if (!firebaseUser || !db) {
        console.warn("AuthContext: Cannot fetch health goals. User not authenticated or DB not available.");
        return;
    }
    // This function might not be strictly necessary if onSnapshot for healthGoals is robust
    // However, it can be useful for explicit refresh actions if ever needed.
    // For now, onSnapshot handles live updates.
    console.log(`AuthContext: Explicit fetchHealthGoals called for ${firebaseUser.uid}. Relying on onSnapshot.`);
  }, [firebaseUser]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!firebaseUser && !!userProfile, // More robust check
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