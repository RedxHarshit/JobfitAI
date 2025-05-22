
// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser, AuthError, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  // RecaptchaVerifier, // No longer creating it here
  signInWithPhoneNumber,
  sendEmailVerification,
} from "firebase/auth";
import type { EmailSignUpFormValues as BaseEmailSignUpFormValues, EmailLoginFormValues } from "@/components/auth/LoginForm";

export interface SignUpFormValues extends BaseEmailSignUpFormValues {
  phone?: string; 
}

interface AuthContextType {
  user: FirebaseUser | null;
  auth: typeof auth | null; // Expose auth for direct use if needed by components like LoginForm for reCAPTCHA
  loading: boolean;
  error: AuthError | null;
  signUp: (values: SignUpFormValues) => Promise<FirebaseUser | null>;
  signIn: (values: EmailLoginFormValues) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  sendVerificationEmail: (user: FirebaseUser) => Promise<boolean>;
  signInWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>; 
  confirmPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<FirebaseUser | null>; 
  // initializeRecaptcha is removed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  // recaptchaVerifier state is removed

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // initializeRecaptcha method is removed

  const sendVerificationEmail = async (fbUser: FirebaseUser): Promise<boolean> => {
    if (!auth || !fbUser) {
      setError({code: "auth/internal-error", message: "User not available for email verification."} as AuthError);
      return false;
    }
    try {
      await sendEmailVerification(fbUser);
      return true;
    } catch (err) {
      setError(err as AuthError);
      return false;
    }
  };

  const signUp = async (values: SignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await sendVerificationEmail(userCredential.user);
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

  const signInWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setLoading(true);
    setError(null);
    console.log("AuthContext: signInWithPhone called for", phoneNumber);

    if (!auth) {
      console.error("AuthContext: Firebase auth not initialized for signInWithPhone");
      setError({code: "auth/internal-error", message:"Firebase auth not initialized"} as AuthError);
      setLoading(false);
      return null;
    }
    
    if (!appVerifier) {
      console.error("AuthContext: App verifier (reCAPTCHA) is null in signInWithPhone.");
      setError({code: "auth/captcha-check-failed", message:"reCAPTCHA verifier not provided to signInWithPhone."} as AuthError);
      setLoading(false);
      return null;
    }

    try {
      console.log("AuthContext: Attempting signInWithPhoneNumber with Firebase...");
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      console.log("AuthContext: signInWithPhoneNumber successful, confirmation result received.");
      return confirmation;
    } catch (err: any) {
      console.error("AuthContext: Error during signInWithPhoneNumber:", err);
      setError(err as AuthError);
      // If reCAPTCHA related errors occur, the calling component (LoginForm) might need to handle re-rendering the verifier.
      // For 'auth/captcha-check-failed' or specific reCAPTCHA errors, it might be useful to advise re-trying.
      if (err.code === 'auth/captcha-check-failed' && appVerifier.render) {
         console.warn("AuthContext: Attempting to reset reCAPTCHA due to error:", err.code);
         // It's generally better to handle re-render/reset in the component owning the verifier.
         // Calling appVerifier.render() here might still face issues if the element is gone.
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmPhoneOtp = async (confirmationResult: ConfirmationResult, otp: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await confirmationResult.confirm(otp);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setError(err as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      auth, // Expose auth instance
      loading, 
      error, 
      signUp, 
      signIn, 
      signOut, 
      sendPasswordReset, 
      sendVerificationEmail,
      signInWithPhone, 
      confirmPhoneOtp,
      // initializeRecaptcha removed
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

// window.recaptchaVerifierInstance is no longer managed by AuthContext
// declare global {
//   interface Window {
//     recaptchaVerifierInstance?: RecaptchaVerifier;
//     grecaptcha?: any; 
//   }
// }
