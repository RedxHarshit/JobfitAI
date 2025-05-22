
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
  RecaptchaVerifier, // Added
  signInWithPhoneNumber, // Added
  sendEmailVerification, // Added
} from "firebase/auth";
import type { EmailSignUpFormValues as BaseEmailSignUpFormValues, EmailLoginFormValues } from "@/components/auth/LoginForm";


// SignUpFormValues from LoginForm might include optionalPhoneNumber
export interface SignUpFormValues extends BaseEmailSignUpFormValues {
  phone?: string; // This 'phone' is optionalPhoneNumber from the form
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
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult | null>; // Added
  confirmPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<FirebaseUser | null>; // Added
  initializeRecaptcha: (containerId: string) => void; // Added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  // RecaptchaVerifier instance needs to be stored if using invisible reCAPTCHA
  // It's typically initialized once.
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const initializeRecaptcha = useCallback((containerId: string) => {
    if (!auth) {
        console.error("Firebase auth not initialized for reCAPTCHA");
        setError({code: "auth/internal-error", message:"Firebase auth not initialized"} as AuthError);
        return;
    }
    try {
        // Check if verifier already exists for this session to avoid re-rendering errors
        if (window.recaptchaVerifierInstance) {
            setRecaptchaVerifier(window.recaptchaVerifierInstance);
            return;
        }

        const verifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible', // Can be 'normal' or 'compact' for visible, or 'invisible'
            'callback': (response: any) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
                // console.log("reCAPTCHA solved:", response);
            },
            'expired-callback': () => {
                // Response expired. Ask user to solve reCAPTCHA again.
                console.warn("reCAPTCHA expired, please try again.");
                setError({code: "auth/captcha-check-failed", message:"reCAPTCHA expired, please try again."} as AuthError);
                recaptchaVerifier?.render().then(widgetId => {
                    if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                        grecaptcha.reset(widgetId);
                    }
                });
            }
        });
        setRecaptchaVerifier(verifier);
        window.recaptchaVerifierInstance = verifier; // Store globally if needed, or manage via state/ref
    } catch (err) {
        console.error("Error initializing RecaptchaVerifier:", err);
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
      // Send verification email
      await sendVerificationEmail(userCredential.user);
      // Phone number (values.phone) is collected but not directly used by createUserWithEmailAndPassword
      // If you need to store it, you would do so here (e.g., update user profile or Firestore document)
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
    if (!auth) {
      setError({code: "auth/internal-error", message:"Firebase auth not initialized"} as AuthError);
      setLoading(false);
      return null;
    }
    if (!recaptchaVerifier && window.recaptchaVerifierInstance) {
        // Attempt to use the globally stored instance if state didn't catch up
        setRecaptchaVerifier(window.recaptchaVerifierInstance);
    }
    
    const verifier = recaptchaVerifier || window.recaptchaVerifierInstance;

    if (!verifier) {
      setError({code: "auth/captcha-check-failed", message:"reCAPTCHA verifier not initialized. Ensure 'recaptcha-container' div exists and is visible."} as AuthError);
      setLoading(false);
      return null;
    }

    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setLoading(false);
      return confirmation;
    } catch (err: any) {
      setError(err as AuthError);
      console.error("Error sending OTP:", err);
       // Reset reCAPTCHA if error is related to it (e.g., auth/captcha-check-failed, auth/invalid-verification-code)
      if (err.code === 'auth/captcha-check-failed' || err.code === 'auth/network-request-failed') {
        verifier.render().then(widgetId => {
            if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                grecaptcha.reset(widgetId);
            }
        }).catch(resetError => console.error("Error resetting reCAPTCHA:", resetError));
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

// Extend the Window interface to include recaptchaVerifierInstance
declare global {
  interface Window {
    recaptchaVerifierInstance?: RecaptchaVerifier;
    grecaptcha?: any; // For reCAPTCHA reset, if needed
  }
}
