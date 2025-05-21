// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

// Client-side check and log for missing critical Firebase config
// This helps in diagnosing issues in deployed/preview environments
if (typeof window !== 'undefined') { // Only run this check on the client-side
  if (!apiKey) {
    // This console error is intentional for debugging missing env vars in previews
    console.error(
      "CRITICAL Firebase Config Error (Client-Side): NEXT_PUBLIC_FIREBASE_API_KEY is missing or undefined. " +
      "This app WILL NOT WORK without it. " +
      "For local development, ensure it's in your .env file. " +
      "For PREVIEW/PRODUCTION ENVIRONMENTS, this variable MUST be set in your hosting provider's environment variable settings."
    );
  }
  if (!projectId) {
    // This console error is intentional for debugging missing env vars in previews
    console.error(
      "CRITICAL Firebase Config Error (Client-Side): NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined. " +
      "This app WILL NOT WORK without it. " +
      "For local development, ensure it's in your .env file. " +
      "For PREVIEW/PRODUCTION ENVIRONMENTS, this variable MUST be set in your hosting provider's environment variable settings."
    );
  }
}

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId, // Optional
};

// Initialize Firebase
let appInstance; // Use a different internal name
if (!getApps().length) {
  // Only attempt to initialize if essential config is present
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
      appInstance = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization failed directly:", e);
      // appInstance will remain undefined, leading to auth/db being null
    }
  } else {
    // This log might be redundant due to the client-side checks above, but good for server-side build logs too
    console.error(
      "Firebase configuration is INCOMPLETE (API Key or Project ID missing). " +
      "Firebase will not be initialized. Double-check your environment variables."
    );
  }
} else {
  appInstance = getApp();
}

// Conditionally get Auth and Firestore only if appInstance was successfully initialized
// Using 'null' to clearly indicate that Firebase services are unavailable if initialization failed
const authInstance = appInstance ? getAuth(appInstance) : null;
const dbInstance = appInstance ? getFirestore(appInstance) : null;

// Export with standard names
export { appInstance as app, authInstance as auth, dbInstance as db };
