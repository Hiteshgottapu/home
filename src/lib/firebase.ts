
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Log the API key loading status for easier debugging
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log(
  "Firebase Initialization Check:",
  `API Key Loaded: ${apiKey ? 'Yes' : 'NO (MISSING or UNDEFINED)'}`,
  `Auth Domain Loaded: ${authDomain ? 'Yes' : 'NO (MISSING or UNDEFINED)'}`,
  `Project ID Loaded: ${projectId ? 'Yes' : 'NO (MISSING or UNDEFINED)'}`
);

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error(
    'CRITICAL Firebase Configuration Missing: One or more of API Key, Auth Domain, or Project ID is undefined. ' +
    '1. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env file at the project root. ' +
    '2. You MUST restart your Next.js development server after creating or modifying the .env file for changes to take effect.'
  );
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      console.log("Firebase initialized successfully and auth instance created.");
    } catch (e) {
      console.error("Error initializing Firebase app or auth:", e);
      // app and auth will remain undefined
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    console.log("Existing Firebase app instance retrieved and auth instance created/retrieved.");
  }
}

export { app, auth };
