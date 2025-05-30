
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
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

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
  fetchHealthGoals: () => Promise<void>; // Kept for explicit calls if needed, but onSnapshot manages it
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
        const fetchedData = userDocSnap.data();
        // Construct local profile, ensuring defaults for missing optional fields in local state
        profileData = {
          id: user.uid,
          name: fetchedData.name || user.displayName || 'User',
          email: fetchedData.email === undefined ? null : fetchedData.email,
          phoneNumber: fetchedData.phoneNumber === undefined ? null : fetchedData.phoneNumber,
          aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(fetchedData.aiFeedbackPreferences || {}) },
          dateOfBirth: fetchedData.dateOfBirth === undefined ? null : fetchedData.dateOfBirth,
          allergies: fetchedData.allergies === undefined ? null : fetchedData.allergies,
          riskFactors: fetchedData.riskFactors === undefined ? null : fetchedData.riskFactors,
          emergencyContact: fetchedData.emergencyContact === undefined ? null : fetchedData.emergencyContact,
          healthGoals: [], // Populated by separate listener
        };
      } else {
        console.log(`AuthContext (fetchUserProfileData): No profile found for user ${user.uid}. Creating new profile.`);
        // Data to be written to Firestore, ensure no undefined values
        const profileDataForFirestore = {
          id: user.uid,
          name: user.displayName || 'New User',
          email: user.email || null,
          phoneNumber: user.phoneNumber || null,
          aiFeedbackPreferences: { ...initialDefaultAiPreferences },
          dateOfBirth: null,
          allergies: [], // Default to empty array instead of null for consistency if preferred
          riskFactors: {}, // Default to empty object
          emergencyContact: null,
          // healthGoals are a subcollection, not stored directly here.
        };
        await setDoc(userDocRef, profileDataForFirestore);
        console.log(`AuthContext (fetchUserProfileData): New profile created in Firestore for user ${user.uid}.`);
        // Construct local profile based on what was written
        profileData = {
            ...profileDataForFirestore,
            healthGoals: [],
            allergies: profileDataForFirestore.allergies as string[] | null, // Cast if needed
            riskFactors: profileDataForFirestore.riskFactors as Record<string, any> | null,
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

      if (user) {
        setFirebaseUser(user);
        const profile = await fetchUserProfileData(user);
        setUserProfile(profile);

        if (profile && db) {
            const userDocRef = doc(db, "users", user.uid);
            userProfileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedProfileData = docSnap.data();
                    setUserProfile(prev => ({
                        ...(prev || ({} as UserProfile)),
                        id: user.uid,
                        name: updatedProfileData.name || user.displayName || 'User',
                        email: updatedProfileData.email === undefined ? null : updatedProfileData.email,
                        phoneNumber: updatedProfileData.phoneNumber === undefined ? null : updatedProfileData.phoneNumber,
                        aiFeedbackPreferences: { ...initialDefaultAiPreferences, ...(updatedProfileData.aiFeedbackPreferences || {}) },
                        dateOfBirth: updatedProfileData.dateOfBirth === undefined ? null : updatedProfileData.dateOfBirth,
                        allergies: updatedProfileData.allergies === undefined ? null : updatedProfileData.allergies,
                        riskFactors: updatedProfileData.riskFactors === undefined ? null : updatedProfileData.riskFactors,
                        emergencyContact: updatedProfileData.emergencyContact === undefined ? null : updatedProfileData.emergencyContact,
                        healthGoals: prev?.healthGoals || [],
                    }));
                    console.log(`AuthContext (onSnapshot userDoc): Profile updated for user ${user.uid}.`);
                } else {
                     console.warn(`AuthContext (onSnapshot userDoc): Profile doc for ${user.uid} disappeared.`);
                }
            }, (error) => {
                console.error(`AuthContext (onSnapshot userDoc): Error listening to user profile for ${user.uid}:`, error);
            });

            const goalsColRef = collection(db, `users/${user.uid}/healthGoals`);
            const q = query(goalsColRef, orderBy("description"));
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
             console.warn(`AuthContext (onAuthStateChanged): No profile fetched/created for authenticated user ${user.uid}.`);
        }
      } else {
        console.log("AuthContext (onAuthStateChanged): User is signed out.");
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
      console.log(`AuthContext (onAuthStateChanged): Processing complete. isLoading: false.`);
    });

    return () => {
      console.log("AuthContext (useEffect cleanup): Cleaning up listeners.");
      authUnsubscribe();
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (healthGoalsUnsubscribe) healthGoalsUnsubscribe();
    };
  }, [fetchUserProfileData]);


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

        const newUserProfileDataForFirestore = {
          id: userCredential.user.uid,
          name: name,
          email: userCredential.user.email || null,
          phoneNumber: userCredential.user.phoneNumber || null,
          aiFeedbackPreferences: { ...initialDefaultAiPreferences },
          dateOfBirth: null,
          allergies: [],
          riskFactors: {},
          emergencyContact: null,
          // healthGoals will be managed by subcollection listener
        };
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, newUserProfileDataForFirestore);
        console.log(`AuthContext (signUpWithEmailPassword): Firestore profile document CREATED for UID: ${userCredential.user.uid}.`);
        // setUserProfile({ ...newUserProfileDataForFirestore, healthGoals: [] }); // Handled by onAuthStateChanged
      }
      console.log("AuthContext (signUpWithEmailPassword END): Sign up successful. Waiting for onAuthStateChanged to finalize state.");
      // setIsLoading(false); // Let onAuthStateChanged handle this for consistency
      return true;
    } catch (error: any) {
      console.error(`AuthContext (signUpWithEmailPassword CATCH): Error during sign up for ${email}. Code: ${error.code}, Message: ${error.message}. Error object:`, error);
      setIsLoading(false);
      throw error; // Re-throw to be caught by UI
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
      if (error.code === 'auth/invalid-credential') {
        console.warn("AuthContext: 'auth/invalid-credential' specifically means the email/password combination is incorrect or the user account does not exist/is disabled for login.");
      }
      setIsLoading(false); // Set loading false here as onAuthStateChanged might not trigger if login fails early
      return false; // Indicate failure
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
      // setUserProfile(null); // onAuthStateChanged handles this
      // setFirebaseUser(null); // onAuthStateChanged handles this
      console.log("AuthContext (logout END): Logout successful. Waiting for onAuthStateChanged to clear user state.");
    } catch (error) {
      console.error("AuthContext (logout CATCH): Logout error:", error);
      setIsLoading(false); // Ensure loading is reset even on error
    }
    // setIsLoading(false); // Let onAuthStateChanged handle final loading state
  };

  const updateUserProfileState = async (updatedProfileData: Partial<UserProfile>) => {
    if (!firebaseUser || !db || !userProfile) {
      console.warn("AuthContext (updateUserProfileState): Cannot update. User not authenticated, DB not available, or profile not loaded.");
      return Promise.reject(new Error("User not authenticated or profile not available."));
    }
    console.log(`AuthContext (updateUserProfileState): Attempting to update Firestore profile for ${firebaseUser.uid}.`);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      // Exclude healthGoals and id as they are managed differently or are identifiers
      const { healthGoals, id, ...profileUpdatesFromArg } = updatedProfileData;

      // Sanitize updates: convert undefined to null for Firestore compatibility
      const dataToUpdate: Record<string, any> = {};
      Object.entries(profileUpdatesFromArg).forEach(([key, value]) => {
        // @ts-ignore
        dataToUpdate[key] = value === undefined ? null : value;
      });

      if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(userDocRef, dataToUpdate);
        console.log(`AuthContext (updateUserProfileState): Firestore profile updated for user ${firebaseUser.uid}.`);
        // Local state will be updated by onSnapshot listener for userDocRef
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
    console.log(`AuthContext (addHealthGoal): Adding health goal for user ${firebaseUser.uid}.`);
    try {
      const goalsColRef = collection(db, `users/${firebaseUser.uid}/healthGoals`);
      const dataToSave = {
        ...goalData,
        userId: firebaseUser.uid, // Ensure userId is part of the document data if needed for rules/queries
        targetDate: goalData.targetDate || null, // Store undefined as null
      };
      const docRef = await addDoc(goalsColRef, dataToSave);
      console.log(`AuthContext (addHealthGoal): Health goal added for user ${firebaseUser.uid} with ID ${docRef.id}.`);
      // onSnapshot will update the local state
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
      const dataToSave = {
        ...dataToUpdate,
        targetDate: dataToUpdate.targetDate || null, // Store undefined as null
      };
      await updateDoc(goalDocRef, dataToSave);
      console.log(`AuthContext (updateHealthGoal): Health goal updated for user ${firebaseUser.uid}, goal ID ${id}.`);
      // onSnapshot will update the local state
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
        // onSnapshot will update the local state
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
    console.log(`AuthContext (updateAiPreferences): Updating AI preferences for user ${firebaseUser.uid}.`);
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newAiPreferences = { ...(userProfile.aiFeedbackPreferences || initialDefaultAiPreferences), ...preferences };
      await updateDoc(userDocRef, { aiFeedbackPreferences: newAiPreferences });
      console.log(`AuthContext (updateAiPreferences): AI preferences updated in Firestore for user ${firebaseUser.uid}.`);
      // Local state will be updated by onSnapshot listener for userDocRef
    } catch (error) {
      console.error(`AuthContext (updateAiPreferences): Error updating AI preferences for ${firebaseUser.uid}:`, error);
      throw error;
    }
  };

  // This function can be kept if there's a scenario where an explicit re-fetch is desired
  // outside of the onSnapshot mechanism, though onSnapshot should cover most real-time needs.
  const fetchHealthGoals = useCallback(async () => {
    if (!firebaseUser || !db) {
        console.warn("AuthContext (fetchHealthGoals): Cannot fetch. User not authenticated or DB not available.");
        return;
    }
    console.log(`AuthContext (fetchHealthGoals): Explicit fetchHealthGoals called for ${firebaseUser.uid}. Real-time updates handled by onSnapshot.`);
    // No explicit fetching logic here anymore as onSnapshot handles it.
    // If you truly needed a one-time fetch, you'd use getDocs here.
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
