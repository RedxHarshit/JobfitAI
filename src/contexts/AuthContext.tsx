// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser, AuthError } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase"; 
// import { db } from "@/lib/firebase"; // No longer directly needed for mail collection here
// import {
//   collection, 
//   addDoc,      
//   serverTimestamp, 
// } from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";
import type { EmailLoginFormValues, EmailSignUpFormValues } from "@/components/auth/LoginForm"; // Assuming LoginForm also uses EmailSignUpFormValues for HR
import type { CandidateSignUpFormValues } from "@/components/auth/CandidateSignUpForm";
import type { CandidateLoginFormValues } from "@/components/auth/CandidateLoginForm";

// Function to call our Next.js API route for sending emails
const sendEmailViaApi = async (to: string, subject: string, html: string, text: string) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, text }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error(`[sendEmailViaApi] Failed to send email to ${to}:`, result.error, result.details);
      return false;
    }
    console.log(`[sendEmailViaApi] Email API call successful for ${to}.`);
    return true;
  } catch (error) {
    console.error(`[sendEmailViaApi] Error calling email API for ${to}:`, error);
    return false;
  }
};


export interface UserProfileUpdate {
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  auth: typeof auth | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (values: EmailSignUpFormValues) => Promise<FirebaseUser | null>; // For HR
  signIn: (values: EmailLoginFormValues) => Promise<FirebaseUser | null>; // For HR
  candidateSignUp: (values: CandidateSignUpFormValues) => Promise<FirebaseUser | null>;
  candidateSignIn: (values: CandidateLoginFormValues) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  sendVerificationEmail: (user: FirebaseUser) => Promise<boolean>;
  updateUserProfile: (profileData: UserProfileUpdate) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        console.log("AuthContext: User state changed, emailVerified:", currentUser.emailVerified);
      }
    });
    return () => unsubscribe();
  }, []);

  const sendVerificationEmail = async (fbUser: FirebaseUser): Promise<boolean> => {
    if (!auth || !fbUser || !fbUser.email) {
      console.error("AuthContext: User, email, or auth not available for email verification.");
      setError({ name: "AuthError", code: "auth/internal-error", message: "User, email or auth not available for email verification." } as AuthError)
      return false;
    }
    try {
      await firebaseSendEmailVerification(fbUser);
      console.log("AuthContext: Firebase verification email sent to", fbUser.email);

      // We are relying on Firebase's default email, so no custom MailerSend call here.
      // If you want to send an *additional* custom styled email:
      // const subject = "Verify Your Email for JobFit AI";
      // const htmlBody = `<p>Hello ${fbUser.displayName || 'User'},</p><p>Please click the link that was sent by Firebase to verify your email address for JobFit AI. If you didn't create an account, you can ignore this email.</p><p>Thanks,<br/>The JobFit AI Team</p>`;
      // const textBody = `Hello ${fbUser.displayName || 'User'},\n\nPlease click the link that was sent by Firebase to verify your email address for JobFit AI. If you didn't create an account, you can ignore this email.\n\nThanks,\nThe JobFit AI Team`;
      // await sendEmailViaApi(fbUser.email, subject, htmlBody, textBody);
      
      return true;
    } catch (err) {
      console.error("AuthContext: Error sending Firebase verification email:", err);
      setError(err as AuthError);
      return false;
    }
  };

  const signUp = async (values: EmailSignUpFormValues): Promise<FirebaseUser | null> => { // HR Sign Up
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await sendVerificationEmail(userCredential.user); // Send Firebase verification email
      }
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setError(err as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (values: EmailLoginFormValues): Promise<FirebaseUser | null> => { // HR Sign In
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setError(err as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const candidateSignUp = async (values: CandidateSignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized for candidate sign up.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await sendVerificationEmail(userCredential.user); // Send Firebase verification email
      }
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setError(err as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const candidateSignIn = async (values: CandidateLoginFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized for candidate sign in.");
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setError(err as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      setError(err as AuthError);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) {
        setError({ name:"AuthError", code: "auth/internal-error", message: "Firebase Auth not initialized." } as AuthError);
        return false;
      }
      await firebaseSendPasswordResetEmail(auth, email);
      console.log("AuthContext: Firebase password reset email sent to", email);
      
      // We are relying on Firebase's default email, so no custom MailerSend call here.
      // If you wanted to send an *additional* custom styled email:
      // const subject = "Password Reset Request for JobFit AI";
      // const htmlBody = `<p>Hello,</p><p>A password reset was requested for your JobFit AI account. Please follow the instructions in the email sent by Firebase to reset your password.</p><p>If you didn't request this, please ignore this email.</p><p>Thanks,<br/>The JobFit AI Team</p>`;
      // const textBody = `Hello,\n\nA password reset was requested for your JobFit AI account. Please follow the instructions in the email sent by Firebase to reset your password.\n\nIf you didn't request this, please ignore this email.\n\nThanks,\nThe JobFit AI Team`;
      // await sendEmailViaApi(email, subject, htmlBody, textBody);

      setLoading(false);
      return true;
    } catch (err) {
      setError(err as AuthError);
      setLoading(false);
      return false;
    }
  };

  const updateUserProfile = async (profileData: UserProfileUpdate): Promise<boolean> => {
    if (!auth?.currentUser) {
      setError({ code: "auth/no-current-user", message: "No user is currently signed in." } as AuthError);
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await firebaseUpdateProfile(auth.currentUser, profileData);
      // Create a new user object with updated properties
      const updatedUser = { ...auth.currentUser, ...profileData } as FirebaseUser; // currentUser is non-null here
      setUser(updatedUser);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err as AuthError);
      setLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      auth,
      loading,
      error,
      signUp,
      signIn,
      candidateSignUp,
      candidateSignIn,
      signOut,
      sendPasswordReset,
      sendVerificationEmail,
      updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
