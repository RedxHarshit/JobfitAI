
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Firebase Storage is no longer initialized here as it's not used by the reverted profile picture feature.

// These are read from process.env (Next.js handles .env for these)
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET; // Kept for other potential uses, but not strictly needed for current features
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

const firebaseConfig: FirebaseOptions = {
  apiKey,
  authDomain,
  projectId,
  storageBucket, // e.g., your-project-id.appspot.com
  messagingSenderId,
  appId,
  measurementId,
};

let appInstance: ReturnType<typeof initializeApp> | undefined = undefined;
let authInstance: ReturnType<typeof getAuth> | null = null;
let dbInstance: ReturnType<typeof getFirestore> | null = null;

let missingConfig = false;
// Client-side check and log for missing critical Firebase config
if (typeof window !== 'undefined') {
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
  // storageBucket is not strictly critical if not using Storage, so check is removed here to prevent unnecessary blocking
}

if (missingConfig) {
  console.error("Firebase initialization HALTED due to missing essential configuration on the client-side.");
} else {
  // Initialize Firebase only if essential keys are present
  if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
    try {
      if (!getApps().length) {
        appInstance = initializeApp(firebaseConfig);
      } else {
        appInstance = getApp();
      }
      
      if (appInstance) {
        authInstance = getAuth(appInstance);
        dbInstance = getFirestore(appInstance);
        // Storage is no longer initialized by default:
        // storageInstance = getStorage(appInstance); 
      } else {
        console.error("Firebase app instance could not be initialized. Auth and Firestore will not be available.");
      }
    } catch (e: any) {
      console.error(`Firebase initialization failed critically: ${e.message}`, e);
      appInstance = undefined;
      authInstance = null;
      dbInstance = null;
    }
  } else {
    if (typeof window === 'undefined') { 
      // This log will appear in the server terminal during build or SSR
      console.error(
          "CRITICAL Firebase Config Error (Server-Side Check in firebase.ts): Essential Firebase configuration (apiKey, authDomain, projectId) is INCOMPLETE. " +
          "Firebase will not be initialized. Check your environment variables (e.g., .env file for local, hosting provider settings for deployed)."
      );
    }
  }
}

export { appInstance as app, authInstance as auth, dbInstance as db };
// storageInstance is no longer exported as it's not initialized by default
