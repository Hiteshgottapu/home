
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
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, Unsubscribe, where } from 'firebase/firestore';

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  signUpWithEmailPassword: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfileState: (updatedProfileData: Partial<UserProfile>) => Promise<void>;
  addHealthGoal: (goalData: Omit<HealthGoal, 'id' | 'userId'>) => Promise<HealthGoal | null>;
  updateHealthGoal: (updatedGoal: HealthGoal) => Promise<void>;
  deleteHealthGoal: (goalId: string) => Promise<void>;
  updateAiPreferences: (preferences: Partial<AiFeedbackPreferences>) => Promise<void>;
  healthGoals: HealthGoal[]; // Expose healthGoals directly
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialDefaultAiPreferences: AiFeedbackPreferences = {
  symptomExplainabilityLevel: 'brief',
  nudgeFrequency: 'medium',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);
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
        const fetchedData = userDocSnap.data();
        profileData = {
          id: user.uid,
          name: fetchedData.name || user.displayName || 'User', // Prioritize Firestore, then Auth, then fallback
          email: fetchedData.email === undefined ? null : fetchedData.email,
          phoneNumber: fetchedData.phoneNumber === undefined ? null : fetchedData.phoneNumber,
          aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(fetchedData.aiFeedbackPreferences || {}) },
          dateOfBirth: fetchedData.dateOfBirth === undefined ? null : fetchedData.dateOfBirth,
          allergies: fetchedData.allergies === undefined ? null : fetchedData.allergies,
          riskFactors: fetchedData.riskFactors === undefined ? null : fetchedData.riskFactors,
          emergencyContact: fetchedData.emergencyContact === undefined ? null : fetchedData.emergencyContact,
          healthGoals: [], // Populated by separate listener, initialized here
        };
      } else {
        console.log(`AuthContext (fetchUserProfileData): No profile found for user ${user.uid}. Creating new profile in Firestore.`);
        const nameForNewProfile = user.displayName || 'User'; // Use Auth displayName or generic 'User'
        
        const profileDataForFirestore: Omit<UserProfile, 'healthGoals' | 'id'> = {
          name: nameForNewProfile,
          email: user.email || null,
          phoneNumber: user.phoneNumber || null,
          aiFeedbackPreferences: { ...initialDefaultAiPreferences },
          dateOfBirth: null,
          allergies: [],
          riskFactors: {},
          emergencyContact: null,
        };
        await setDoc(userDocRef, profileDataForFirestore);
        console.log(`AuthContext (fetchUserProfileData): New profile CREATED in Firestore for user ${user.uid} with name: ${nameForNewProfile}.`);
        profileData = {
            id: user.uid,
            ...profileDataForFirestore,
            healthGoals: [],
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

      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
      setHealthGoals([]); // Clear health goals on auth change

      if (user) {
        setFirebaseUser(user);
        const initialProfile = await fetchUserProfileData(user);
        setUserProfile(initialProfile); // Set initial profile

        if (db) { // Ensure db is available before setting up listeners
            const userDocRef = doc(db, "users", user.uid);
            // Listener for main user profile document (excluding healthGoals)
            userProfileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedFSProfileData = docSnap.data();
                    setUserProfile(prevProfile => ({
                        ...(prevProfile || {} as UserProfile), // Keep parts of previous profile if not in snapshot (like healthGoals)
                        id: user.uid,
                        name: updatedFSProfileData.name || user.displayName || 'User', // Prioritize Firestore name
                        email: updatedFSProfileData.email === undefined ? (prevProfile?.email) : updatedFSProfileData.email,
                        phoneNumber: updatedFSProfileData.phoneNumber === undefined ? (prevProfile?.phoneNumber) : updatedFSProfileData.phoneNumber,
                        aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(updatedFSProfileData.aiFeedbackPreferences || {}) },
                        dateOfBirth: updatedFSProfileData.dateOfBirth === undefined ? (prevProfile?.dateOfBirth) : updatedFSProfileData.dateOfBirth,
                        allergies: updatedFSProfileData.allergies === undefined ? (prevProfile?.allergies) : updatedFSProfileData.allergies,
                        riskFactors: updatedFSProfileData.riskFactors === undefined ? (prevProfile?.riskFactors) : updatedFSProfileData.riskFactors,
                        emergencyContact: updatedFSProfileData.emergencyContact === undefined ? (prevProfile?.emergencyContact) : updatedFSProfileData.emergencyContact,
                        healthGoals: prevProfile?.healthGoals || [], // Preserve healthGoals from its own listener
                    }));
                    console.log(`AuthContext (onSnapshot userDoc): Profile updated for user ${user.uid}. Name from FS: ${updatedFSProfileData.name}`);
                } else {
                     console.warn(`AuthContext (onSnapshot userDoc): Profile doc for ${user.uid} does not exist in Firestore.`);
                }
            }, (error) => {
                console.error(`AuthContext (onSnapshot userDoc): Error listening to user profile for ${user.uid}:`, error);
            });

            // Listener for healthGoals subcollection
            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description"));
            healthGoalsUnsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedGoals: HealthGoal[] = [];
                snapshot.forEach(doc => fetchedGoals.push({ id: doc.id, ...doc.data() } as HealthGoal));
                setHealthGoals(fetchedGoals); // Update separate healthGoals state
                // Also update healthGoals within userProfile if needed, though direct access might be cleaner
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: fetchedGoals } : null);
                console.log(`AuthContext (onSnapshot healthGoals): Health goals updated for user ${user.uid}. Count: ${fetchedGoals.length}`);
            }, (error) => {
                console.error(`AuthContext (onSnapshot healthGoals): Error listening to health goals for ${user.uid}:`, error);
                setHealthGoals([]);
                setUserProfile(prevProfile => prevProfile ? { ...prevProfile, healthGoals: [] } : null);
            });
        } else {
            console.error("AuthContext (onAuthStateChanged): Firestore instance (db) is not available for snapshot listeners.");
        }
      } else {
        console.log("AuthContext (onAuthStateChanged): User is signed out.");
        setFirebaseUser(null);
        setUserProfile(null);
        setHealthGoals([]);
      }
      setIsLoading(false);
      console.log(`AuthContext (onAuthStateChanged): Processing complete. isLoading: ${isLoading}, isAuthenticated: ${!!user}`);
    });

    return () => {
      console.log("AuthContext (useEffect cleanup): Cleaning up listeners.");
      authUnsubscribe();
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
    };
  }, [fetchUserProfileData]); // Keep fetchUserProfileData in dependency array


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
      const user = userCredential.user;
      console.log(`AuthContext (signUpWithEmailPassword): Firebase user CREATED. UID: ${user.uid}`);

      await updateFirebaseProfile(user, { displayName: name });
      console.log(`AuthContext (signUpWithEmailPassword): Firebase profile display name UPDATED for UID: ${user.uid} to ${name}.`);

      const newUserProfileDataForFirestore: Omit<UserProfile, 'healthGoals' | 'id'> = {
        name: name, // Use the name from the signup form directly
        email: user.email || null,
        phoneNumber: user.phoneNumber || null,
        aiFeedbackPreferences: { ...initialDefaultAiPreferences },
        dateOfBirth: null,
        allergies: [],
        riskFactors: {},
        emergencyContact: null,
      };
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, newUserProfileDataForFirestore);
      console.log(`AuthContext (signUpWithEmailPassword): Firestore profile document CREATED for UID: ${user.uid} with name: ${name}.`);
      
      // onAuthStateChanged will now handle fetching and setting the profile correctly.
      console.log("AuthContext (signUpWithEmailPassword END): Sign up successful. Waiting for onAuthStateChanged to finalize state.");
      // setIsLoading(false); // Let onAuthStateChanged handle global isLoading
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
      return false;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting firebaseUser, userProfile, and final isLoading.
      console.log("AuthContext (loginWithEmailPassword END): loginWithEmailPassword successful. Waiting for onAuthStateChanged.");
      // setIsLoading(false); // Let onAuthStateChanged handle global isLoading
      return true;
    } catch (error: any) {
      console.error(`AuthContext (loginWithEmailPassword CATCH): Firebase signInWithEmailAndPassword FAILED for ${email}. Code: ${error.code}, Message: ${error.message}.`);
      if (error.code === 'auth/invalid-credential') {
        console.warn("AuthContext: 'auth/invalid-credential' specifically means the email/password combination is incorrect or the user account does not exist/is disabled for login.");
      }
      setIsLoading(false); 
      return false; 
    }
  };

  const logout = async () => {
    console.log("AuthContext (logout BEGIN): Attempting logout.");
    setIsLoading(true);
    if (!auth) {
      console.error("AuthContext (logout): Auth not initialized.");
      setIsLoading(false);
      return;
    }
    try {
      await signOut(auth);
      console.log("AuthContext (logout END): Logout successful. Waiting for onAuthStateChanged to clear user state.");
    } catch (error) {
      console.error("AuthContext (logout CATCH): Logout error:", error);
    }
    // setIsLoading(false); // Let onAuthStateChanged handle final loading state
  };

  const updateUserProfileState = async (updatedProfileData: Partial<UserProfile>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext (updateUserProfileState): Cannot update. User not authenticated, DB not available, or profile not loaded.");
      return Promise.reject(new Error("User not authenticated or profile not available."));
    }
    console.log(`AuthContext (updateUserProfileState): Attempting to update Firestore profile for ${firebaseUser.uid}. Data:`, updatedProfileData);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const { healthGoals: goalsToExclude, id: idToExclude, ...profileUpdatesFromArg } = updatedProfileData;

      const dataToUpdate: Record<string, any> = {};
      Object.entries(profileUpdatesFromArg).forEach(([key, value]) => {
        // @ts-ignore
        dataToUpdate[key] = value === undefined ? null : value;
      });

      if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(userDocRef, dataToUpdate);
        console.log(`AuthContext (updateUserProfileState): Firestore profile UPDATED for user ${firebaseUser.uid}.`);
      } else {
        console.log(`AuthContext (updateUserProfileState): No top-level profile fields to update for user ${firebaseUser.uid}.`);
      }
      return Promise.resolve();
    } catch (error) {
      console.error(`AuthContext (updateUserProfileState): Error updating Firestore profile for ${firebaseUser.uid}:`, error);
      throw error;
    }
  };

  const addHealthGoal = async (goalData: Omit<HealthGoal, 'id' | 'userId'>): Promise<HealthGoal | null> => {
    if (!firebaseUser || !db) {
      console.warn("AuthContext (addHealthGoal): Cannot add. User not authenticated or DB not available.");
      return null;
    }
    console.log(`AuthContext (addHealthGoal): Adding health goal for user ${firebaseUser.uid}. Data:`, goalData);
    try {
      const goalsColRef = collection(db, `users/${firebaseUser.uid}/healthGoals`);
      const dataToSave = {
        ...goalData,
        userId: firebaseUser.uid, 
        targetDate: goalData.targetDate || null, 
      };
      const docRef = await addDoc(goalsColRef, dataToSave);
      console.log(`AuthContext (addHealthGoal): Health goal ADDED for user ${firebaseUser.uid} with ID ${docRef.id}.`);
      return { id: docRef.id, ...dataToSave, targetDate: dataToSave.targetDate === null ? undefined : dataToSave.targetDate };
    } catch (error) {
      console.error(`AuthContext (addHealthGoal): Error adding health goal for ${firebaseUser.uid}:`, error);
      throw error;
    }
  };

  const updateHealthGoal = async (updatedGoal: HealthGoal) => {
    if (!firebaseUser || !db || !updatedGoal.id) {
      console.warn("AuthContext (updateHealthGoal): Cannot update. Invalid parameters. Goal ID:", updatedGoal.id);
      return;
    }
     console.log(`AuthContext (updateHealthGoal): Updating health goal ID ${updatedGoal.id} for user ${firebaseUser.uid}. Data:`, updatedGoal);
    try {
      const goalDocRef = doc(db, `users/${firebaseUser.uid}/healthGoals`, updatedGoal.id);
      const { id, userId, ...dataToUpdate } = updatedGoal;
      const dataToSave = {
        ...dataToUpdate,
        targetDate: dataToUpdate.targetDate || null, 
      };
      await updateDoc(goalDocRef, dataToSave);
      console.log(`AuthContext (updateHealthGoal): Health goal UPDATED for user ${firebaseUser.uid}, goal ID ${id}.`);
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
        console.log(`AuthContext (deleteHealthGoal): Health goal DELETED for user ${firebaseUser.uid}, goal ID ${goalId}.`);
    } catch (error) {
        console.error(`AuthContext (deleteHealthGoal): Error deleting health goal for ${firebaseUser.uid}, goal ID ${goalId}:`, error);
        throw error;
    }
  };

  const updateAiPreferences = async (preferences: Partial<AiFeedbackPreferences>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext (updateAiPreferences): Cannot update. Invalid parameters or profile not loaded.");
      return Promise.reject(new Error("User not authenticated or profile not available for AI pref update."));
    }
    console.log(`AuthContext (updateAiPreferences): Updating AI preferences for user ${firebaseUser.uid}. New partial prefs:`, preferences);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      console.log(`AuthContext (updateAiPreferences): AI preferences UPDATED in Firestore for user ${firebaseUser.uid}.`);
    } catch (error) {
      console.error(`AuthContext (updateAiPreferences): Error updating AI preferences for ${firebaseUser.uid}:`, error);
      throw error;
    }
  };

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
      healthGoals // Provide healthGoals directly from the context
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
  // console.log("useAuth hook called, current context value:", context); // For debugging
  return context;
};

    