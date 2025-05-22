
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
  updateProfile as firebaseUpdateProfile, // Import updateProfile
} from "firebase/auth";
import type { EmailLoginFormValues as BaseEmailLoginFormValues, EmailSignUpFormValues as BaseEmailSignUpFormValues } from "@/components/auth/LoginForm";

// Ensure SignUpFormValues matches the simplified form (email/password only)
export interface SignUpFormValues extends Omit<BaseEmailSignUpFormValues, 'confirmPassword'> {
  // No phone number here anymore
}
export type EmailLoginFormValues = BaseEmailLoginFormValues;

export interface UserProfileUpdate {
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  auth: typeof auth | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (values: SignUpFormValues) => Promise<FirebaseUser | null>;
  signIn: (values: EmailLoginFormValues) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  sendVerificationEmail: (user: FirebaseUser) => Promise<boolean>;
  updateUserProfile: (profileData: UserProfileUpdate) => Promise<boolean>; // New function
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
    });
    return () => unsubscribe();
  }, []);

  const sendVerificationEmail = async (fbUser: FirebaseUser): Promise<boolean> => {
    if (!auth || !fbUser) {
      console.error("AuthContext: User or auth not available for email verification.");
      return false;
    }
    try {
      await firebaseSendEmailVerification(fbUser);
      console.log("AuthContext: Verification email sent to", fbUser.email);
      return true;
    } catch (err) {
      console.error("AuthContext: Error sending verification email:", err);
      return false;
    }
  };

  const signUp = async (values: SignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await sendVerificationEmail(userCredential.user);
      }
      setUser(userCredential.user); // Set user state
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
      setUser(userCredential.user); // Set user state
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
      // Manually update the user object in state to reflect changes immediately
      // as onAuthStateChanged might not fire immediately for profile updates.
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
      signUp, 
      signIn, 
      signOut, 
      sendPasswordReset,
      sendVerificationEmail,
      updateUserProfile, // Expose the new function
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
