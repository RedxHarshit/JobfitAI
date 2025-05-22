
// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser, AuthError, ConfirmationResult } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
} from "firebase/auth";
import type { EmailSignUpFormValues as BaseEmailSignUpFormValues, EmailLoginFormValues } from "@/components/auth/LoginForm";

export interface SignUpFormValues extends BaseEmailSignUpFormValues {
  phone?: string; 
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (values: SignUpFormValues) => Promise<FirebaseUser | null>;
  signIn: (values: EmailLoginFormValues) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  sendVerificationEmail: (user: FirebaseUser) => Promise<boolean>;
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult | null>; 
  confirmPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<FirebaseUser | null>; 
  initializeRecaptcha: (containerId: string) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const initializeRecaptcha = useCallback((containerId: string) => {
    console.log("AuthContext: initializeRecaptcha called for container:", containerId);
    if (!auth) {
        console.error("AuthContext: Firebase auth not initialized for reCAPTCHA");
        setError({code: "auth/internal-error", message:"Firebase auth not initialized"} as AuthError);
        return;
    }
    try {
        if (window.recaptchaVerifierInstance) {
            console.log("AuthContext: Using existing window.recaptchaVerifierInstance.");
            setRecaptchaVerifier(window.recaptchaVerifierInstance);
            return;
        }
        console.log("AuthContext: Creating new RecaptchaVerifier.");
        const verifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible',
            'callback': (response: any) => {
                console.log("AuthContext: reCAPTCHA solved:", response);
            },
            'expired-callback': () => {
                console.warn("AuthContext: reCAPTCHA expired, please try again.");
                setError({code: "auth/captcha-check-failed", message:"reCAPTCHA expired, please try again."} as AuthError);
                // Attempt to reset reCAPTCHA for the user to try again
                window.recaptchaVerifierInstance?.render().then(widgetId => {
                    if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                        grecaptcha.reset(widgetId);
                        console.log("AuthContext: reCAPTCHA reset after expiration.");
                    }
                }).catch(err => console.error("AuthContext: Error resetting reCAPTCHA after expiration:", err));
            }
        });
        setRecaptchaVerifier(verifier);
        window.recaptchaVerifierInstance = verifier;
        console.log("AuthContext: RecaptchaVerifier created and set on window and state.");
    } catch (err) {
        console.error("AuthContext: Error initializing RecaptchaVerifier:", err);
        setError(err as AuthError);
    }
  }, [auth]);


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

  const signInWithPhone = async (phoneNumber: string): Promise<ConfirmationResult | null> => {
    setLoading(true);
    setError(null);
    console.log("AuthContext: signInWithPhone called for", phoneNumber);

    if (!auth) {
      console.error("AuthContext: Firebase auth not initialized for signInWithPhone");
      setError({code: "auth/internal-error", message:"Firebase auth not initialized"} as AuthError);
      setLoading(false);
      return null;
    }
    
    const verifierToUse = recaptchaVerifier || window.recaptchaVerifierInstance;
    console.log("AuthContext: Verifier status - state:", !!recaptchaVerifier, "window:", !!window.recaptchaVerifierInstance);


    if (!verifierToUse) {
      console.error("AuthContext: reCAPTCHA verifier is null in signInWithPhone.");
      setError({code: "auth/captcha-check-failed", message:"reCAPTCHA verifier not initialized. Ensure 'recaptcha-container' div exists and is visible."}as AuthError);
      setLoading(false);
      return null;
    }

    try {
      console.log("AuthContext: Attempting signInWithPhoneNumber with Firebase...");
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifierToUse);
      console.log("AuthContext: signInWithPhoneNumber successful, confirmation result received.");
      setLoading(false);
      return confirmation;
    } catch (err: any) {
      console.error("AuthContext: Error during signInWithPhoneNumber:", err);
      setError(err as AuthError);
      if (err.code === 'auth/captcha-check-failed' || err.code === 'auth/network-request-failed' || err.code === 'auth/too-many-requests') {
        console.warn("AuthContext: Attempting to reset reCAPTCHA due to error:", err.code);
        verifierToUse.render().then(widgetId => {
            if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                grecaptcha.reset(widgetId);
                console.log("AuthContext: reCAPTCHA reset after error.");
            }
        }).catch(resetError => console.error("AuthContext: Error resetting reCAPTCHA:", resetError));
      }
      setLoading(false);
      return null;
    }
  };

  const confirmPhoneOtp = async (confirmationResult: ConfirmationResult, otp: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await confirmationResult.confirm(otp);
      setUser(userCredential.user);
      setLoading(false);
      return userCredential.user;
    } catch (err) {
      setError(err as AuthError);
      setLoading(false);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      signUp, 
      signIn, 
      signOut, 
      sendPasswordReset, 
      sendVerificationEmail,
      signInWithPhone, 
      confirmPhoneOtp,
      initializeRecaptcha
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

declare global {
  interface Window {
    recaptchaVerifierInstance?: RecaptchaVerifier;
    grecaptcha?: any; 
  }
}
