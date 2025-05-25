// src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react"; // Added useState
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Loader } from "@/components/ui/loader";

export default function LoginPage() {
  const { user, loading: authContextLoading } = useAuth(); // Renamed to avoid conflict
  const router = useRouter();
  const [isInitialAuthCheck, setIsInitialAuthCheck] = useState(true);

  useEffect(() => {
    // This effect runs when authContextLoading changes or when user changes
    if (!authContextLoading) {
      setIsInitialAuthCheck(false); // Mark initial check as done once authContextLoading is false
      if (user) {
        router.replace("/dashboard"); // Redirect if already logged in
      }
    }
  }, [user, authContextLoading, router]);

  // Show loader only during the very first auth state check from AuthContext
  if (isInitialAuthCheck && authContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
      </div>
    );
  }
  
  // If initial check is done (or even if it's not done but user object is already present),
  // and user exists, show loader while redirecting.
  if (user) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
        <p className="ml-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  // If initial check is done and no user, OR 
  // if an auth operation is in progress (authContextLoading is true but isInitialAuthCheck is false),
  // render the LoginForm. LoginForm itself will handle disabling buttons etc. based on authContextLoading.
  return <LoginForm />;
}
