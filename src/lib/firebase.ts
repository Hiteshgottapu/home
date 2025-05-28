
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Analytics can be added if needed

// Explicitly load environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

// --- CRITICAL DEBUGGING STEP ---
// Please check your browser and server console for the following logs when the app starts.
// These logs show the Firebase configuration values as loaded from your .env file.
// If these values are 'MISSING/UNDEFINED' or do not match your Firebase project settings,
// please check your .env file in the project root and restart your development server.
console.log("--- Firebase Configuration Check (from src/lib/firebase.ts) ---");
console.log(`Loaded NEXT_PUBLIC_FIREBASE_API_KEY: ${apiKey ? `"${apiKey}"` : 'MISSING/UNDEFINED'}`);
console.log(`Loaded NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${authDomain ? `"${authDomain}"` : 'MISSING/UNDEFINED'}`);
console.log(`Loaded NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId ? `"${projectId}"` : 'MISSING/UNDEFINED'}`);
console.log("-------------------------------------------------------------");

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
let storageInstance: FirebaseStorage | undefined = undefined;
// let analytics; // Uncomment if you add getAnalytics

if (!apiKey || !authDomain || !projectId) {
  console.error(
    "CRITICAL FIREBASE INIT ERROR: Essential Firebase configuration (API Key, Auth Domain, or Project ID) is MISSING or UNDEFINED. Firebase will NOT be initialized.\n" +
    "TROUBLESHOOTING STEPS:\n" +
    "1. VERIFY the .env file exists in your project's ROOT directory.\n" +
    "2. CHECK that NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env file.\n" +
    "   Copy these values directly from your Firebase Project Settings > General > Your apps > Web app > SDK setup and configuration (select 'Config').\n" +
    "3. ENSURE there are no typos or extra spaces in the .env file's variable names or their values.\n" +
    "4. **IMPORTANT**: You MUST RESTART your Next.js development server (e.g., stop and rerun `npm run dev`) after any changes to the .env file."
  );
} else if (apiKey === "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX" || apiKey.startsWith("YOUR_API_KEY") || apiKey.startsWith("PASTE_YOUR")) {
  console.error(
    `CRITICAL FIREBASE INIT ERROR: The API Key ("${apiKey}") appears to be a GENERIC PLACEHOLDER.\n` +
    "Please replace it with your ACTUAL Firebase Web App API Key in the .env file (NEXT_PUBLIC_FIREBASE_API_KEY) and RESTART your server.\n" +
    "Find your key in: Firebase Console > Project Settings > General > Your apps > Web app > SDK setup and configuration (select 'Config')."
  );
} else {
  const firebaseConfig = {
    apiKey: apiKey,
    authDomain: authDomain,
    projectId: projectId,
    storageBucket: storageBucket,
    messagingSenderId: messagingSenderId,
    appId: appId,
    measurementId: measurementId, // measurementId is optional
  };

  console.log("Attempting to initialize Firebase with the following configuration:", firebaseConfig);

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      storageInstance = getStorage(app);
      // analytics = getAnalytics(app); // Uncomment if you add getAnalytics
      console.log("Firebase app initialized successfully. Auth, Firestore, and Storage instances created.");
    } catch (e: any) {
      console.error("ERROR DURING FIREBASE INITIALIZATION (initializeApp, getAuth, getFirestore, or getStorage):", e.message);
      console.error("Firebase config used during failed initialization:", firebaseConfig);
      console.error("Full error object:", e);
      // app, authInstance, dbInstance, storageInstance will remain undefined
    }
  } else {
    app = getApp();
    authInstance = getAuth(app); 
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
    // analytics = getAnalytics(app); // Uncomment if you add getAnalytics
    console.log("Existing Firebase app instance retrieved. Auth, Firestore, and Storage instances created/retrieved.");
  }
}

// IMPORTANT: Set up Firestore Security Rules in the Firebase console
// to protect your data. A basic rule for user-specific data might be:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId}/{document=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }
// And for Firebase Storage:
// rules_version = '2';
// service firebase.storage {
//  match /b/{bucket}/o {
//    match /users/{userId}/{allPaths=**} {
//      allow read, write: if request.auth != null && request.auth.uid == userId;
//    }
//  }
// }

export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
// export { app, authInstance as auth, dbInstance as db, storageInstance as storage, analytics }; // Uncomment if you add getAnalytics

    