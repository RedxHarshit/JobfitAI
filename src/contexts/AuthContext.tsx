
// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser, AuthError } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";
import type { EmailLoginFormValues as BaseEmailLoginFormValues, EmailSignUpFormValues as BaseEmailSignUpFormValues } from "@/components/auth/LoginForm"; // For HR portal
import type { CandidateSignUpFormValues as BaseCandidateSignUpFormValues } from "@/components/auth/CandidateSignUpForm"; // For Candidate portal
import type { CandidateLoginFormValues as BaseCandidateLoginFormValues } from "@/components/auth/CandidateLoginForm"; // For Candidate portal


// For HR Portal
export type EmailLoginFormValues = BaseEmailLoginFormValues;
export type EmailSignUpFormValues = BaseEmailSignUpFormValues;

// For Candidate Portal
export type CandidateSignUpFormValues = BaseCandidateSignUpFormValues;
export type CandidateLoginFormValues = BaseCandidateLoginFormValues;


export interface UserProfileUpdate {
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  auth: typeof auth | null;
  loading: boolean;
  error: AuthError | null;
  // HR Portal Auth
  signUp: (values: EmailSignUpFormValues) => Promise<FirebaseUser | null>;
  signIn: (values: EmailLoginFormValues) => Promise<FirebaseUser | null>;
  // Candidate Portal Auth
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
    if (!auth || !fbUser) {
      console.error("AuthContext: User or auth not available for email verification.");
      setError({ name: "AuthError", code: "auth/internal-error", message: "User or auth not available for email verification." } as AuthError)
      return false;
    }
    try {
      await firebaseSendEmailVerification(fbUser);
      console.log("AuthContext: Verification email sent to", fbUser.email);
      return true;
    } catch (err) {
      console.error("AuthContext: Error sending verification email:", err);
      setError(err as AuthError);
      return false;
    }
  };

  // For HR Portal
  const signUp = async (values: EmailSignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        // Optionally send verification for HR users too, or handle differently
        await sendVerificationEmail(userCredential.user);
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

  const signIn = async (values: EmailLoginFormValues): Promise<FirebaseUser | null> => {
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

  // For Candidate Portal
  const candidateSignUp = async (values: CandidateSignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized for candidate sign up.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await sendVerificationEmail(userCredential.user);
        // Optionally, set a display name if provided (e.g., from a 'name' field if you add it to CandidateSignUpFormValues)
        // await firebaseUpdateProfile(userCredential.user, { displayName: values.name });
      }
      setUser(userCredential.user); // Set user state, they are technically "logged in" but dashboard should check emailVerified
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
      if (!auth) throw new Error("Firebase Auth not initialized.");
      await sendPasswordResetEmail(auth, email);
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
      setUser(prevUser => prevUser ? { ...prevUser, ...profileData } as FirebaseUser : null);
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
      signUp, // For HR
      signIn, // For HR
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
