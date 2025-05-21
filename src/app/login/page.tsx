// src/app/login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Loader } from "@/components/ui/loader";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard"); // Redirect if already logged in
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
      </div>
    );
  }
  
  // If user is already defined and we are on /login, redirect away
  if (user) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
        <p className="ml-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return <LoginForm />;
}
