
// src/app/candidate/login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CandidateLoginForm } from "@/components/auth/CandidateLoginForm";
import { Loader } from "@/components/ui/loader";

export default function CandidateLoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/candidate/dashboard"); // Redirect if already logged in
    }
  }, [user, loading, router]);

  if (loading || user) { // Show loader if auth state is loading or if user exists (while redirecting)
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
        {user && <p className="ml-4">Redirecting to your dashboard...</p>}
      </div>
    );
  }

  return <CandidateLoginForm />;
}
