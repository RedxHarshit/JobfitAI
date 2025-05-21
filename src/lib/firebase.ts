// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

// Client-side check and log for missing critical Firebase config
if (typeof window !== 'undefined') {
  const essentialConfigs = [
    { name: "NEXT_PUBLIC_FIREBASE_API_KEY", value: apiKey },
    { name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", value: authDomain },
    { name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", value: projectId },
  ];

  essentialConfigs.forEach(config => {
    if (!config.value) {
      console.error(
        `CRITICAL Firebase Config Error (Client-Side): ${config.name} is missing or undefined. ` +
        "This app WILL NOT WORK without it. " +
        "For local development, ensure it's in your .env file. " +
        "For PREVIEW/PRODUCTION ENVIRONMENTS, this variable MUST be set in your hosting provider's environment variable settings."
      );
    }
  });
}

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

if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  try {
    if (!getApps().length) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApp();
    }
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
  } catch (e: any) {
    console.error(`Firebase initialization failed: ${e.message}`, e);
    // Ensure instances are null if initialization fails at any point
    appInstance = undefined;
    authInstance = null;
    dbInstance = null;
  }
} else {
  console.error(
    "Firebase core configuration (apiKey, authDomain, projectId) is INCOMPLETE. " +
    "Firebase will not be initialized. Double-check your environment variables."
  );
}

export { appInstance as app, authInstance as auth, dbInstance as db };
