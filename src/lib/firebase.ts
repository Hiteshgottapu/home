
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
const googleApiKey = process.env.GOOGLE_API_KEY;

export let firebaseInitializationError: string | null = null;
export let isFirebaseSuccessfullyInitialized: boolean = false;

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
let storageInstance: FirebaseStorage | undefined = undefined;

// Generic placeholder patterns - ensure these exactly match what you use in .env placeholders
const exactPlaceholders = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
  googleApiKey: "YOUR_GOOGLE_AI_STUDIO_API_KEY_HERE",
};

const commonPlaceholderIndicators = [
  "AIzaSyYOUR_PLACEHOLDER", // A common Firebase placeholder prefix
  "PASTE_YOUR",
  "XXXXX" // General placeholder indicator
];

const isPlaceholder = (value: string | undefined, specificPlaceholder?: string): boolean => {
  if (!value) return false; // If undefined or empty, it's not a placeholder we are checking for here
  if (specificPlaceholder && value === specificPlaceholder) return true;
  return commonPlaceholderIndicators.some(indicator => value.includes(indicator));
};

console.log("--- Firebase Configuration Values Loaded from .env ---");
console.log(`NEXT_PUBLIC_FIREBASE_API_KEY: ${apiKey || 'MISSING/UNDEFINED'}`);
console.log(`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${authDomain || 'MISSING/UNDEFINED'}`);
console.log(`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId || 'MISSING/UNDEFINED'}`);
console.log(`GOOGLE_API_KEY: ${googleApiKey || 'MISSING/UNDEFINED'}`);
console.log("----------------------------------------------------");


if (!apiKey || !authDomain || !projectId) {
  firebaseInitializationError =
    "CRITICAL FIREBASE INIT ERROR: Essential Firebase configuration (API Key, Auth Domain, or Project ID) is MISSING or UNDEFINED in your .env file. Firebase will NOT be initialized.\n\n" +
    "TROUBLESHOOTING STEPS:\n" +
    "1. VERIFY the .env file exists in your project's ROOT directory.\n" +
    "2. CHECK that NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env file.\n" +
    "   Copy these values directly from your Firebase Project Settings > General > Your apps > Web app > SDK setup and configuration (select 'Config').\n" +
    "3. ENSURE there are no typos or extra spaces in the .env file's variable names or their values.\n" +
    "4. **IMPORTANT**: You MUST RESTART your Next.js development server (e.g., stop and rerun `npm run dev`) after any changes to the .env file.";
  console.error(firebaseInitializationError); // This remains a console.error as it's a critical missing setup
} else if (
    apiKey === exactPlaceholders.apiKey ||
    authDomain === exactPlaceholders.authDomain ||
    projectId === exactPlaceholders.projectId ||
    isPlaceholder(apiKey) // Broader check for common placeholder patterns
) {
  let specificPlaceholderError = `The following Firebase configuration values in your .env file appear to be GENERIC PLACEHOLDERS:\n`;
  if (apiKey === exactPlaceholders.apiKey || isPlaceholder(apiKey)) specificPlaceholderError += `- NEXT_PUBLIC_FIREBASE_API_KEY: "${apiKey}"\n`;
  if (authDomain === exactPlaceholders.authDomain || isPlaceholder(authDomain)) specificPlaceholderError += `- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "${authDomain}"\n`;
  if (projectId === exactPlaceholders.projectId || isPlaceholder(projectId)) specificPlaceholderError += `- NEXT_PUBLIC_FIREBASE_PROJECT_ID: "${projectId}"\n`;

  firebaseInitializationError =
    `FIREBASE CONFIGURATION INCOMPLETE: \n${specificPlaceholderError}` +
    "\nPlease replace them with your ACTUAL Firebase Web App credentials in the .env file and RESTART your server.\n" +
    "Find your keys in: Firebase Console > Project Settings > General > Your apps > Web app > SDK setup and configuration (select 'Config').\n" +
    "\nAlso ensure other Firebase variables (STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID) and GOOGLE_API_KEY are correctly set if used.";
  console.warn(firebaseInitializationError); // Changed to console.warn for placeholders
} else if (googleApiKey && (googleApiKey === exactPlaceholders.googleApiKey || isPlaceholder(googleApiKey))) {
  // This warning is for the Google AI key, separate from core Firebase init.
  const googleKeyWarning =
    `GOOGLE AI KEY CONFIGURATION INCOMPLETE: The GOOGLE_API_KEY ("${googleApiKey}") in your .env file appears to be a GENERIC PLACEHOLDER.\n` +
    "Genkit AI features requiring Google AI models may not work correctly.\n" +
    "Please replace it with your ACTUAL Google AI Studio API Key and RESTART your server.";
  console.warn(googleKeyWarning);
  // Allow Firebase core to initialize if only Google key is placeholder, but flag it.
  // The main firebaseInitializationError might be null here if Firebase core keys are fine.
  if (!firebaseInitializationError) {
      // If no prior Firebase core error, we can still try to init Firebase.
      // The Genkit part requiring Google AI will fail later if key isn't right.
  } else {
      // Append Google key warning to existing Firebase core error.
      firebaseInitializationError += "\n\n" + googleKeyWarning;
  }
  // Proceed with Firebase init attempt even if Google AI key is a placeholder, as Firebase core might be okay
  const firebaseConfig = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId };
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      isFirebaseSuccessfullyInitialized = true; 
    } catch (e: any) {
      isFirebaseSuccessfullyInitialized = false;
      const coreInitFailMsg = "Additionally, Firebase core initialization failed: " + e.message;
      firebaseInitializationError = (firebaseInitializationError ? firebaseInitializationError + "\n\n" : "") + coreInitFailMsg;
      console.error("Firebase core initialization failed:", e);
    }
  } else {
    app = getApp();
    isFirebaseSuccessfullyInitialized = true;
  }

} else {
  // All critical Firebase keys seem present and not obvious placeholders.
  const firebaseConfig = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId };
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      isFirebaseSuccessfullyInitialized = true;
    } catch (e: any) {
      isFirebaseSuccessfullyInitialized = false;
      firebaseInitializationError = "CRITICAL FIREBASE INIT ERROR: Firebase core initialization failed: " + e.message;
      console.error(firebaseInitializationError, e);
    }
  } else {
    app = getApp();
    isFirebaseSuccessfullyInitialized = true;
  }
}

if (isFirebaseSuccessfullyInitialized && app) {
  try {
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
    console.log("Firebase app initialized successfully. Auth, Firestore, and Storage instances created.");
  } catch (e: any) {
    isFirebaseSuccessfullyInitialized = false; // Downgrade success if sub-services fail
    const subServiceError = "Firebase sub-service initialization error (Auth, Firestore, or Storage): " + e.message;
    firebaseInitializationError = (firebaseInitializationError ? firebaseInitializationError + "\n\n" : "") + subServiceError;
    console.error(subServiceError, e);
  }
} else if (!firebaseInitializationError && !isFirebaseSuccessfullyInitialized) { 
    // This case means initialization failed silently or an unhandled state.
    firebaseInitializationError = "UNKNOWN FIREBASE INITIALIZATION ERROR: Firebase app object is not available after initialization attempt, but no specific error was caught or set. Please check .env configuration and server logs.";
    console.error(firebaseInitializationError);
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
