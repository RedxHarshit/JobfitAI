
// src/app/candidate/signup/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CandidateSignUpForm } from "@/components/auth/CandidateSignUpForm";
import { Loader } from "@/components/ui/loader";

export default function CandidateSignUpPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in AND their email is verified, redirect to dashboard
    // This prevents verified users from seeing the signup page again.
    // Unverified users (who just signed up) will be handled by the form itself to show "verify email" message.
    if (!loading && user && user.emailVerified) {
      router.replace("/candidate/dashboard");
    }
  }, [user, loading, router]);

  // Show loader if auth state is loading or if user exists and is verified (while redirecting)
  if (loading || (user && user.emailVerified)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
        {(user && user.emailVerified) && <p className="ml-4">Redirecting to your dashboard...</p>}
      </div>
    );
  }

  // If no user, or user exists but email is not verified (form handles showing "verify email" message), show signup form
  return <CandidateSignUpForm />;
}
