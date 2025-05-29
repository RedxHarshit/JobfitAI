
// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser, AuthError } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase"; // Import db
import {
  collection, // Import collection
  addDoc,      // Import addDoc
  serverTimestamp, // Import serverTimestamp
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail, // Keep original for direct Firebase call if needed
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";
import type { EmailLoginFormValues, EmailSignUpFormValues } from "@/components/auth/LoginForm";
import type { CandidateSignUpFormValues } from "@/components/auth/CandidateSignUpForm";
import type { CandidateLoginFormValues } from "@/components/auth/CandidateLoginForm";


export interface UserProfileUpdate {
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  auth: typeof auth | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (values: EmailSignUpFormValues) => Promise<FirebaseUser | null>;
  signIn: (values: EmailLoginFormValues) => Promise<FirebaseUser | null>;
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
      // Firebase direct email verification (sends its own template)
      await firebaseSendEmailVerification(fbUser);
      console.log("AuthContext: Firebase verification email sent to", fbUser.email);

      // Optionally, you can also trigger your custom email template via the 'mail' collection
      // if you want more control over the template than Firebase's default.
      // For now, we'll rely on Firebase's default email.
      // If you wanted a custom one via MailerSend/Trigger Email extension:
      /*
      if (db) {
        await addDoc(collection(db, "mail"), {
          to: [fbUser.email],
          message: {
            subject: "Verify Your Email for JobFit AI",
            html: `<p>Hello ${fbUser.displayName || 'User'},</p><p>Please click the link below to verify your email address for JobFit AI. If you didn't create an account, you can ignore this email.</p><p>Note: Firebase sends its own verification link. This is a placeholder for a custom template.</p><p>Thanks,<br/>The JobFit AI Team</p>`,
          },
          triggeredByUid: fbUser.uid,
          createdAt: serverTimestamp(),
        });
        console.log(`AuthContext: Verification email request added to 'mail' collection for ${fbUser.email}`);
      }
      */
      return true;
    } catch (err) {
      console.error("AuthContext: Error sending verification email:", err);
      setError(err as AuthError);
      return false;
    }
  };

  const signUp = async (values: EmailSignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
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

  const candidateSignUp = async (values: CandidateSignUpFormValues): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized for candidate sign up.");
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
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
      if (!auth || !db) { // Also check for db
        setError({ name:"AuthError", code: "auth/internal-error", message: "Firebase not fully initialized." } as AuthError);
        return false;
      }
      // Firebase direct password reset (sends its own template)
      await firebaseSendPasswordResetEmail(auth, email);
      console.log("AuthContext: Firebase password reset email sent to", email);

      // Optional: Add to 'mail' collection if you want a custom template via MailerSend
      /*
      await addDoc(collection(db, "mail"), {
        to: [email],
        message: {
          subject: "Password Reset Request for JobFit AI",
          html: `<p>Hello,</p><p>You requested a password reset for your JobFit AI account. Please follow the instructions sent by Firebase to reset your password.</p><p>If you didn't request this, please ignore this email.</p><p>Thanks,<br/>The JobFit AI Team</p>`,
        },
        createdAt: serverTimestamp(),
      });
      console.log(`AuthContext: Password reset request added to 'mail' collection for ${email}`);
      */
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
      const updatedUser = { ...auth.currentUser, ...profileData } as FirebaseUser;
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
