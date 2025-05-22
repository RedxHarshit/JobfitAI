
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Added for Firebase Storage

// These are read from process.env (Next.js handles .env for these)
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

const firebaseConfig: FirebaseOptions = {
  apiKey,
  authDomain,
  projectId,
  storageBucket, // Ensure this is correct, e.g., your-project-id.appspot.com
  messagingSenderId,
  appId,
  measurementId,
};

let appInstance;
let authInstance = null;
let dbInstance = null;
let storageInstance = null; // Added for Firebase Storage

// Client-side check and log for missing critical Firebase config
if (typeof window !== 'undefined') {
  let missingConfig = false;
  if (!apiKey) {
    console.error(
      "CRITICAL Firebase Config Error (Client-Side): NEXT_PUBLIC_FIREBASE_API_KEY is missing or undefined. " +
      "This app WILL NOT WORK without it. " +
      "For local development, ensure it's in your .env file. " +
      "For PREVIEW/PRODUCTION ENVIRONMENTS, this variable MUST be set in your hosting provider's environment variable settings."
    );
    missingConfig = true;
  }
  if (!authDomain) {
    console.error("CRITICAL Firebase Config Error (Client-Side): NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing.");
    missingConfig = true;
  }
  if (!projectId) {
    console.error("CRITICAL Firebase Config Error (Client-Side): NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing.");
    missingConfig = true;
  }
   if (!storageBucket) { 
    console.error("CRITICAL Firebase Config Error (Client-Side): NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing. File uploads will fail.");
    missingConfig = true;
  }

  if (missingConfig) {
    console.error("Firebase initialization HALTED due to missing essential configuration on the client-side.");
  }
}


// Initialize Firebase only if essential keys are present
if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.storageBucket) {
  try {
    if (!getApps().length) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApp();
    }
    
    if (appInstance) {
      authInstance = getAuth(appInstance);
      dbInstance = getFirestore(appInstance);
      storageInstance = getStorage(appInstance); // Initialize Storage
    } else {
      console.error("Firebase app instance could not be initialized. Auth, Firestore, and Storage will not be available.");
    }
  } catch (e: any) {
    console.error(`Firebase initialization failed critically: ${e.message}`, e);
    appInstance = undefined;
    authInstance = null;
    dbInstance = null;
    storageInstance = null;
  }
} else {
  if (typeof window === 'undefined') { 
    // This log will appear in the server terminal during build or SSR
    console.error(
        "CRITICAL Firebase Config Error (Server-Side Check in firebase.ts): Essential Firebase configuration (apiKey, authDomain, projectId, storageBucket) is INCOMPLETE. " +
        "Firebase will not be initialized. Check your environment variables (e.g., .env file for local, hosting provider settings for deployed)."
    );
  }
}

export { appInstance as app, authInstance as auth, dbInstance as db, storageInstance as storage };
