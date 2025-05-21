
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
};

let appInstance;
let authInstance = null;
let dbInstance = null;

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
  // Also check for GOOGLE_API_KEY for Genkit if on client, though it's primarily server-side.
  // This is more of a reminder if someone tries to use Genkit client-side directly without proper setup.
  // Genkit flows are typically invoked via server actions or API routes.
  if (!process.env.GOOGLE_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
     // console.warn("Genkit Info: GOOGLE_API_KEY (for server-side Genkit) or NEXT_PUBLIC_GOOGLE_API_KEY (if used client-side) seems to be missing. AI features might not work.");
  }


  if (missingConfig) {
    console.error("Firebase initialization HALTED due to missing essential configuration on the client-side.");
  }
}


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
  // Note: The client-side specific error for missing Firebase keys is handled above.
}

export { appInstance as app, authInstance as auth, dbInstance as db };
