
// src/app/candidate/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CandidateLoginForm } from "@/components/auth/CandidateLoginForm";
import { Loader } from "@/components/ui/loader";

export default function CandidateLoginPage() {
  const { user, loading: authContextLoading } = useAuth();
  const router = useRouter();
  const [isInitialAuthCheck, setIsInitialAuthCheck] = useState(true);

  useEffect(() => {
    if (!authContextLoading) {
      setIsInitialAuthCheck(false);
      // Only redirect if user exists AND their email is verified
      if (user && user.emailVerified) {
        router.replace("/candidate/dashboard");
      }
    }
  }, [user, authContextLoading, router]);

  // Show loader during the initial auth check
  if (isInitialAuthCheck && authContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
      </div>
    );
  }

  // If user exists and is verified, show loader while redirecting
  if (user && user.emailVerified) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
        <p className="ml-4">Redirecting to your dashboard...</p>
      </div>
    );
  }

  // If initial check is done and no user, OR if user exists but email is not verified,
  // render the CandidateLoginForm. The form itself will handle showing "verify email" messages.
  return <CandidateLoginForm />;
}
