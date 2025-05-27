
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Explicitly load environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

// Log the status of critical environment variables
console.log(
  "Firebase Initialization Parameters Check (from src/lib/firebase.ts):",
  `NEXT_PUBLIC_FIREBASE_API_KEY: ${apiKey || 'MISSING/UNDEFINED'}`,
  `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${authDomain || 'MISSING/UNDEFINED'}`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId || 'MISSING/UNDEFINED'}`
);

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined; // Renamed to avoid conflict

if (!apiKey || !authDomain || !projectId) {
  console.error(
    'CRITICAL: Firebase core configuration (API Key, Auth Domain, or Project ID) is missing or undefined in environment variables. Firebase will NOT be initialized. ' +
    'Please ensure ALL of the following are correctly set in your .env file at the project root: ' +
    '\n - NEXT_PUBLIC_FIREBASE_API_KEY' +
    '\n - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' +
    '\n - NEXT_PUBLIC_FIREBASE_PROJECT_ID' +
    '\nAfter saving the .env file, YOU MUST RESTART your Next.js development server for changes to take effect.' +
    '\nVerify there are no typos or extra spaces in your .env file values.'
  );
  // You could throw an error here to completely halt the app if Firebase is non-negotiable
  // throw new Error("Critical Firebase configuration is missing. Application cannot proceed.");
} else {
  const firebaseConfig = {
    apiKey: apiKey,
    authDomain: authDomain,
    projectId: projectId,
    storageBucket: storageBucket,
    messagingSenderId: messagingSenderId,
    appId: appId,
    measurementId: measurementId, // measurementId is optional and can be undefined
  };

  if (!getApps().length) {
    try {
      console.log("Attempting to initialize Firebase with config:", firebaseConfig);
      app = initializeApp(firebaseConfig);
      authInstance = getAuth(app);
      console.log("Firebase initialized successfully and auth instance created.");
    } catch (e) {
      console.error("Error during Firebase app initialization (initializeApp or getAuth):", e);
      // app and authInstance will remain undefined
    }
  } else {
    app = getApp();
    authInstance = getAuth(app); // Ensure authInstance is assigned here too
    console.log("Existing Firebase app instance retrieved. Auth instance created/retrieved.");
  }
}

export { app, authInstance as auth }; // Export authInstance as auth
