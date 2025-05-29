
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
import { auth, db } from '@/lib/firebase'; // Ensure db is correctly imported if used here
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
      console.error("AuthContext: Firestore instance (db) is not available for fetchUserProfileData.");
      return null;
    }
    const userDocRef = doc(db, "users", user.uid);
    console.log(`AuthContext: Fetching profile for user ${user.uid}`);
    try {
      const userDocSnap = await getDoc(userDocRef);
      let profileData: UserProfile;

      if (userDocSnap.exists()) {
        console.log(`AuthContext: Profile found for user ${user.uid}.`);
        profileData = userDocSnap.data() as UserProfile;
        if (!profileData.healthGoals) profileData.healthGoals = []; // Ensure healthGoals array exists
        // Ensure AI preferences are initialized with defaults if partially set or missing
        profileData.aiFeedbackPreferences = { ...initialDefaultAiPreferences, ...(profileData.aiFeedbackPreferences || {}) };

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
          // Initialize other fields as needed
        };
        await setDoc(userDocRef, profileData);
        console.log(`AuthContext: New profile created in Firestore for user ${user.uid}.`);
      }
      return profileData;
    } catch (error) {
        console.error("AuthContext: Error fetching/creating user profile in Firestore:", error);
        return null; // Return null if Firestore operation fails
    }
  }, []);


  useEffect(() => {
    let userProfileUnsubscribe: Unsubscribe | undefined;
    let healthGoalsUnsubscribe: Unsubscribe | undefined;

    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: onAuthStateChanged triggered. User:", user ? user.uid : 'null');
      setIsLoading(true); // Set loading true at the start of auth state change

      // Clean up previous listeners
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();

      if (user) {
        setFirebaseUser(user); // Set Firebase user immediately
        const profile = await fetchUserProfileData(user);
        setUserProfile(profile); // This can be null if fetchUserProfileData fails

        if (profile && db) { // Only set up listeners if profile was fetched and db is available
            // Listener for main user profile document (for AI preferences, etc.)
            const userDocRef = doc(db, "users", user.uid);
            console.log(`AuthContext: Subscribing to profile changes for user ${user.uid}`);
            userProfileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedProfile = docSnap.data() as UserProfile;
                    setUserProfile(prev => ({
                        ...(prev || updatedProfile), // Keep existing healthGoals if already fetched
                        ...updatedProfile,
                         aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(updatedProfile.aiFeedbackPreferences || {}) },
                    }));
                    console.log(`AuthContext: Profile updated for user ${user.uid} via snapshot.`);
                } else {
                     console.warn(`AuthContext: Profile doc for ${user.uid} disappeared during onSnapshot listener.`);
                     setUserProfile(null); // Or handle re-creation if necessary
                }
            }, (error) => {
                console.error(`AuthContext: Error listening to user profile for ${user.uid}:`, error);
                setUserProfile(null);
            });

            // Listener for health goals subcollection
            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description")); // Example ordering
            console.log(`AuthContext: Subscribing to health goals for user ${user.uid}`);
            healthGoalsUnsubscribe = onSnapshot(q, (snapshot) => {
                const goals: HealthGoal[] = [];
                snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() } as HealthGoal));
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: goals } : null);
                console.log(`AuthContext: Health goals updated for user ${user.uid} via snapshot. Count: ${goals.length}`);
            }, (error) => {
                console.error(`AuthContext: Error listening to health goals for ${user.uid}:`, error);
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: [] } : null);
            });
        } else if (!profile) {
            console.warn(`AuthContext: No profile fetched for user ${user.uid}, listeners not set up.`);
        }

      } else {
        console.log("AuthContext: User is signed out by onAuthStateChanged.");
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false); // Set loading false after all processing for this auth state
      console.log(`AuthContext: setIsLoading(false). isAuthenticated: ${!!user && !!userProfile}`);
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener and Firestore subscriptions.");
      authUnsubscribe();
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
    };
  }, [fetchUserProfileData]);


  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    console.log(`AuthContext: Attempting signUpWithEmailPassword for email: ${email}`);
    setIsLoading(true);
    if (!auth || !db) {
      console.error("AuthContext: Auth or DB not initialized for signUpWithEmailPassword.");
      setIsLoading(false);
      throw new Error("Signup service not available. Please try again later.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log(`AuthContext: Firebase user created: ${userCredential.user.uid}`);

      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: name });
        console.log(`AuthContext: Firebase profile display name updated for ${userCredential.user.uid}.`);

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
        console.log(`AuthContext: Firestore profile document created for ${userCredential.user.uid}.`);
        // setUserProfile(newUserProfile); // Optimistic update, onAuthStateChanged will also fetch
      }
      // onAuthStateChanged will handle setting firebaseUser and userProfile globally,
      // and also setting isLoading to false eventually.
      // We set isLoading to false here if we want quicker UI response,
      // but onAuthStateChanged is the ultimate source of truth for auth state.
      // For now, let onAuthStateChanged handle the final setIsLoading(false).
      // setIsLoading(false); // Can be set here, or rely on onAuthStateChanged
      console.log("AuthContext: signUpWithEmailPassword successful.");
      return true;
    } catch (error: any) {
      console.error(`AuthContext: Error during signUpWithEmailPassword for ${email}. Code: ${error.code}, Message: ${error.message}`, error);
      setIsLoading(false);
      throw error; // Re-throw for the UI component to handle (e.g., show specific error toast)
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    console.log(`AuthContext: Attempting loginWithEmailPassword for email: ${email}`);
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext: Auth not initialized for loginWithEmailPassword.");
      setIsLoading(false);
      // It's better to throw an error if auth isn't available, caught by calling component
      throw new Error("AuthContext: Authentication service not available.");
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting firebaseUser, userProfile, and final isLoading.
      // setIsLoading(false); // Let onAuthStateChanged handle this for consistency
      console.log("AuthContext: loginWithEmailPassword successful. Waiting for onAuthStateChanged.");
      return true;
    } catch (error: any) {
      console.error(`AuthContext: Firebase signInWithEmailAndPassword error for ${email}. Code: ${error.code}, Message: ${error.message}`, error);
      setIsLoading(false);
      return false; // Indicate failure to the calling component for generic error message
    }
  };

  const logout = async () => {
    console.log("AuthContext: Attempting logout.");
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext: Auth not initialized for logout.");
      setIsLoading(false);
      return;
    }
    try {
      await signOut(auth);
      // onAuthStateChanged will set firebaseUser and userProfile to null
      // and also handle setIsLoading(false)
      console.log("AuthContext: Logout successful. Waiting for onAuthStateChanged.");
    } catch (error) {
      console.error("AuthContext: Logout error:", error);
      setIsLoading(false); // Ensure loading is false if signOut itself errors
    }
  };

  const updateUserProfileState = async (updatedProfileData: Partial<UserProfile>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext: Cannot update user profile state. User not authenticated, DB not available, or profile not loaded.");
      return;
    }
    console.log(`AuthContext: Attempting to update user profile in Firestore for ${firebaseUser.uid}.`);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      // Make sure not to overwrite healthGoals if it's managed by a separate listener or not included
      const { healthGoals, ...profileToUpdate } = updatedProfileData;
      await updateDoc(userDocRef, profileToUpdate);
      // Optimistic update locally or rely on onSnapshot from useEffect
      // setUserProfile(prev => prev ? { ...prev, ...profileToUpdate } : null);
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
    console.log(`AuthContext: Adding health goal for user ${firebaseUser.uid}.`);
    try {
      const goalsColRef = collection(db, `users/${firebaseUser.uid}/healthGoals`);
      const newGoalData = { ...goalData, userId: firebaseUser.uid }; // Ensure userId is set
      const docRef = await addDoc(goalsColRef, newGoalData);
      console.log(`AuthContext: Health goal added for user ${firebaseUser.uid} with ID ${docRef.id}.`);
      // onSnapshot in useEffect will update the local state
      return { id: docRef.id, ...newGoalData };
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
     console.log(`AuthContext: Updating health goal ID ${updatedGoal.id} for user ${firebaseUser.uid}.`);
    try {
      const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, updatedGoal.id);
      // Ensure userId is not part of the data being updated if it's already in the path
      const { id, userId, ...dataToUpdate } = updatedGoal;
      await updateDoc(goalDocRef, dataToUpdate);
      console.log(`AuthContext: Health goal updated for user ${firebaseUser.uid}, goal ID ${id}.`);
      // onSnapshot will update local state
    } catch (error) {
      console.error(`AuthContext: Error updating health goal for ${firebaseUser.uid}, goal ID ${updatedGoal.id}:`, error);
    }
  };

  const deleteHealthGoal = async (goalId: string) => {
    if (!firebaseUser || !db) {
      console.warn("AuthContext: Cannot delete health goal. User not authenticated or DB not available.");
      return;
    }
    console.log(`AuthContext: Deleting health goal ID ${goalId} for user ${firebaseUser.uid}.`);
    try {
        const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, goalId);
        await deleteDoc(goalDocRef);
        console.log(`AuthContext: Health goal deleted for user ${firebaseUser.uid}, goal ID ${goalId}.`);
        // onSnapshot will update local state
    } catch (error) {
        console.error(`AuthContext: Error deleting health goal for ${firebaseUser.uid}, goal ID ${goalId}:`, error);
    }
  };

  const updateAiPreferences = async (preferences: Partial<AiFeedbackPreferences>) => {
    if (!firebaseUser || !db || !userProfile) { // Check userProfile as well to ensure currentAiPreferences can be formed
      console.warn("AuthContext: Cannot update AI preferences. Invalid parameters or profile not loaded.");
      return;
    }
    console.log(`AuthContext: Updating AI preferences for user ${firebaseUser.uid}.`);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      // Merge with existing or default AI preferences before updating
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      console.log(`AuthContext: AI preferences updated in Firestore for user ${firebaseUser.uid}.`);
      // onSnapshot will update local state for userProfile.aiFeedbackPreferences
    } catch (error) {
      console.error(`AuthContext: Error updating AI preferences for ${firebaseUser.uid}:`, error);
    }
  };

  // This function might not be strictly necessary if onSnapshot for healthGoals is robust
  // It can be useful for explicit refresh actions if ever needed.
  const fetchHealthGoals = useCallback(async () => {
    if (!firebaseUser || !db) {
        console.warn("AuthContext: Cannot fetch health goals. User not authenticated or DB not available.");
        return;
    }
    // For now, onSnapshot handles live updates for health goals.
    // If an explicit fetch and replace is needed, implement here.
    console.log(`AuthContext: Explicit fetchHealthGoals called for ${firebaseUser.uid}. Relying on onSnapshot primarily.`);
  }, [firebaseUser]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!firebaseUser && !!userProfile, // Profile must also exist
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

