
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
  console.log("Attempting to initialize Firebase with config:", JSON.parse(JSON.stringify(firebaseConfig)));

  const essentialConfigs = [
    { name: "NEXT_PUBLIC_FIREBASE_API_KEY", value: apiKey },
    { name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", value: authDomain },
    { name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", value: projectId },
  ];

  let missingConfig = false;
  essentialConfigs.forEach(config => {
    if (!config.value) {
      console.error(
        `CRITICAL Firebase Config Error (Client-Side): ${config.name} is missing or undefined. ` +
        "This app WILL NOT WORK without it. " +
        "For local development, ensure it's in your .env file. " +
        "For PREVIEW/PRODUCTION ENVIRONMENTS, this variable MUST be set in your hosting provider's environment variable settings."
      );
      missingConfig = true;
    }
  });

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
    // It's good practice to try initializing auth and db only if appInstance is valid
    if (appInstance) {
      authInstance = getAuth(appInstance);
      dbInstance = getFirestore(appInstance);
    } else {
      console.error("Firebase app instance could not be initialized. Auth and Firestore will not be available.");
    }
  } catch (e: any) {
    console.error(`Firebase initialization failed critically: ${e.message}`, e);
    // Ensure instances are null if initialization fails
    appInstance = undefined;
    authInstance = null;
    dbInstance = null;
  }
} else {
  if (typeof window === 'undefined') { // Log for server-side if config is missing
    console.error(
        "CRITICAL Firebase Config Error (Server-Side): Essential Firebase configuration (apiKey, authDomain, projectId) is INCOMPLETE. " +
        "Firebase will not be initialized. Check your environment variables."
    );
  }
  // On client-side, the detailed errors are already logged above.
}

export { appInstance as app, authInstance as auth, dbInstance as db };
