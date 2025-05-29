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
        // Ensure defaults for nested structures if they might be missing from older profiles
        if (!profileData.healthGoals) profileData.healthGoals = [];
        profileData.aiFeedbackPreferences = { ...initialDefaultAiPreferences, ...(profileData.aiFeedbackPreferences || {}) };
        if (!profileData.allergies) profileData.allergies = [];
        if (!profileData.riskFactors) profileData.riskFactors = {};
        
      } else {
        console.log(`AuthContext (fetchUserProfileData): No profile found for user ${user.uid}. Creating new profile.`);
        // Construct the data to be saved to Firestore, ensuring no undefined top-level fields
        const profileDataForFirestore: Omit<UserProfile, 'healthGoals'> & { healthGoals?: HealthGoal[] } = { // healthGoals handled by subcollection
          id: user.uid,
          name: user.displayName || 'New User',
          email: user.email || null, // Use null if email is undefined
          phoneNumber: user.phoneNumber || null, // Use null if phoneNumber is undefined
          aiFeedbackPreferences: { ...initialDefaultAiPreferences },
          dateOfBirth: null, // Default to null
          allergies: [], // Default to empty array
          riskFactors: {}, // Default to empty object
          emergencyContact: null, // Default to null
        };
        await setDoc(userDocRef, profileDataForFirestore);
        console.log(`AuthContext (fetchUserProfileData): New profile created in Firestore for user ${user.uid}.`);
        // Construct the local UserProfile object, healthGoals will be populated by its own listener
        profileData = {
            ...profileDataForFirestore,
            email: profileDataForFirestore.email === null ? undefined : profileDataForFirestore.email, // Convert null back to undefined for local state if needed
            phoneNumber: profileDataForFirestore.phoneNumber === null ? undefined : profileDataForFirestore.phoneNumber,
            dateOfBirth: profileDataForFirestore.dateOfBirth === null ? undefined : profileDataForFirestore.dateOfBirth,
            emergencyContact: profileDataForFirestore.emergencyContact === null ? undefined : profileDataForFirestore.emergencyContact,
            healthGoals: [], // Initialize as empty, will be populated by snapshot listener
        };
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
        const profile = await fetchUserProfileData(user); // This now handles profile creation if needed
        setUserProfile(profile);

        if (profile && db) { // Check if profile was successfully fetched/created
            const userDocRef = doc(db, "users", user.uid);
            console.log(`AuthContext (onAuthStateChanged): Subscribing to profile changes for user ${user.uid}`);
            userProfileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedProfileData = docSnap.data() as UserProfile;
                    setUserProfile(prev => ({
                        ...(prev || updatedProfileData), // Use fetched data as base if prev is null
                        ...updatedProfileData, // Apply updates
                         aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(updatedProfileData.aiFeedbackPreferences || {}) },
                         // healthGoals will be updated by its own listener
                    }));
                    console.log(`AuthContext (onSnapshot userDoc): Profile updated for user ${user.uid}. Name: ${updatedProfileData.name}`);
                } else {
                     console.warn(`AuthContext (onSnapshot userDoc): Profile doc for ${user.uid} disappeared.`);
                     setUserProfile(null); // Or attempt to re-fetch/re-create
                }
            }, (error) => {
                console.error(`AuthContext (onSnapshot userDoc): Error listening to user profile for ${user.uid}:`, error);
            });

            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description")); // Example ordering
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
            // Handle case where profile couldn't be fetched or created for an authenticated user
             console.warn(`AuthContext (onAuthStateChanged): No profile fetched/created for authenticated user ${user.uid}. Firestore listeners not set up.`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserProfileData]); // fetchUserProfileData is stable due to useCallback


  const signUpWithEmailPassword = async (email: string, password: string, name: string): Promise<boolean> => {
    console.log(`AuthContext (signUpWithEmailPassword BEGIN): Attempting sign up for email: ${email}, name: ${name}`);
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

        // Construct the data to be saved to Firestore, ensuring no undefined top-level fields
        const newUserProfileDataForFirestore: Omit<UserProfile, 'healthGoals'> & { healthGoals?: HealthGoal[] } = {
          id: userCredential.user.uid,
          name: name,
          email: userCredential.user.email || null, // Use null if email is undefined
          phoneNumber: userCredential.user.phoneNumber || null, // Use null if phoneNumber is undefined
          aiFeedbackPreferences: { ...initialDefaultAiPreferences },
          dateOfBirth: null, // Explicitly null instead of undefined
          allergies: [],     // Default to empty array
          riskFactors: {},   // Default to empty object
          emergencyContact: null, // Explicitly null instead of undefined
        };
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, newUserProfileDataForFirestore); // healthGoals will be a subcollection
        console.log(`AuthContext (signUpWithEmailPassword): Firestore profile document CREATED for UID: ${userCredential.user.uid}.`);
        
        // The local userProfile state will be set by onAuthStateChanged via fetchUserProfileData
      }
      console.log("AuthContext (signUpWithEmailPassword END): Sign up successful. Waiting for onAuthStateChanged to finalize state.");
      // setIsLoading(false); // Let onAuthStateChanged handle this
      return true;
    } catch (error: any) {
      console.error(`AuthContext (signUpWithEmailPassword CATCH): Error during sign up for ${email}. Code: ${error.code}, Message: ${error.message}. Error object:`, error);
      setIsLoading(false);
      throw error;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    console.log(`AuthContext (loginWithEmailPassword BEGIN): Attempting login for email: ${email}`);
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext (loginWithEmailPassword): Auth not initialized.");
      setIsLoading(false);
      throw new Error("AuthContext: Authentication service not available.");
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting firebaseUser, userProfile, and final isLoading.
      // setIsLoading(false); // Let onAuthStateChanged handle this for consistency
      console.log("AuthContext (loginWithEmailPassword END): loginWithEmailPassword successful. Waiting for onAuthStateChanged.");
      return true;
    } catch (error: any) {
      console.error(`AuthContext (loginWithEmailPassword CATCH): Firebase signInWithEmailAndPassword FAILED for ${email}. Code: ${error.code}, Message: ${error.message}. Firebase error object:`, error);
      setIsLoading(false); // Set loading false here as onAuthStateChanged might not fire if login fails
      return false;
    }
  };

  const logout = async () => {
    console.log("AuthContext (logout BEGIN): Attempting logout.");
    setIsLoading(true); // Indicate loading state during logout process
    if (!auth) {
      console.error("AuthContext (logout): Auth not initialized.");
      setIsLoading(false);
      return;
    }
    try {
      await signOut(auth);
      console.log("AuthContext (logout END): Logout successful. Waiting for onAuthStateChanged to clear user state.");
      // onAuthStateChanged will set firebaseUser and userProfile to null
      // setIsLoading(false) will be handled by onAuthStateChanged
    } catch (error) {
      console.error("AuthContext (logout CATCH): Logout error:", error);
      setIsLoading(false);
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
      // Prepare data for Firestore: remove healthGoals (managed separately) and convert any undefined to null for top-level fields
      const { healthGoals, id, ...profileUpdatesFromArg } = updatedProfileData;
      
      const currentProfileForUpdate = { ...userProfile, ...profileUpdatesFromArg }; // Merge with current profile to get all fields

      const dataToUpdate: Partial<Omit<UserProfile, 'id' | 'healthGoals'>> = {};
      (Object.keys(profileUpdatesFromArg) as Array<keyof typeof profileUpdatesFromArg>).forEach(key => {
        if (key !== 'healthGoals' && key !== 'id') {
          // @ts-ignore
          dataToUpdate[key] = currentProfileForUpdate[key] === undefined ? null : currentProfileForUpdate[key];
        }
      });
      
      if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(userDocRef, dataToUpdate);
        console.log(`AuthContext (updateUserProfileState): Firestore profile updated for user ${firebaseUser.uid}.`);
      } else {
        console.log(`AuthContext (updateUserProfileState): No top-level profile fields to update for user ${firebaseUser.uid}.`);
      }

      // If healthGoals were part of updatedProfileData, they should be handled by their specific functions
      // This generic updateUserProfileState is for the main user document fields.

    } catch (error) {
      console.error(`AuthContext (updateUserProfileState): Error updating Firestore profile for ${firebaseUser.uid}:`, error);
      throw error; // Re-throw to allow UI to handle
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
      // Ensure targetDate is either a valid ISO string or null/omitted for Firestore
      const dataToSave = {
        ...goalData,
        userId: firebaseUser.uid,
        targetDate: goalData.targetDate || null, // Store null if undefined
      };
      const docRef = await addDoc(goalsColRef, dataToSave);
      console.log(`AuthContext (addHealthGoal): Health goal added for user ${firebaseUser.uid} with ID ${docRef.id}.`);
      return { id: docRef.id, ...dataToSave, targetDate: dataToSave.targetDate === null ? undefined : dataToSave.targetDate };
    } catch (error) {
      console.error(`AuthContext (addHealthGoal): Error adding health goal for ${firebaseUser.uid}:`, error);
      throw error;
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
      // Ensure targetDate is either a valid ISO string or null/omitted for Firestore
      const dataToSave = {
        ...dataToUpdate,
        targetDate: dataToUpdate.targetDate || null, // Store null if undefined
      };
      await updateDoc(goalDocRef, dataToSave);
      console.log(`AuthContext (updateHealthGoal): Health goal updated for user ${firebaseUser.uid}, goal ID ${id}.`);
    } catch (error) {
      console.error(`AuthContext (updateHealthGoal): Error updating health goal for ${firebaseUser.uid}, goal ID ${updatedGoal.id}:`, error);
      throw error;
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
        throw error;
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
      // Merge with existing preferences to ensure all fields are present
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      console.log(`AuthContext (updateAiPreferences): AI preferences updated in Firestore for user ${firebaseUser.uid}.`);
    } catch (error) {
      console.error(`AuthContext (updateAiPreferences): Error updating AI preferences for ${firebaseUser.uid}:`, error);
      throw error;
    }
  };

  const fetchHealthGoals = useCallback(async () => {
    // This function can remain for explicit fetches if needed,
    // but onSnapshot in useEffect now handles real-time updates for healthGoals.
    if (!firebaseUser || !db) {
        console.warn("AuthContext (fetchHealthGoals): Cannot fetch. User not authenticated or DB not available.");
        return;
    }
    console.log(`AuthContext (fetchHealthGoals): Explicit fetchHealthGoals called for ${firebaseUser.uid}. Real-time updates handled by onSnapshot.`);
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

// Ensure UserProfile type matches Firestore structure (e.g., null for optional fields if that's how they're stored)
// or handle conversion between undefined (local state) and null (Firestore) as needed.
// The current implementation converts undefined optional fields to null before writing to Firestore.
// When reading, it converts null back to undefined for consistency in the local UserProfile state,
// except for collections like allergies, riskFactors which default to empty structures.
