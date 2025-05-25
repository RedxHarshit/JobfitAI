// src/app/page.tsx
"use client";

import { useEffect, useState } from "react"; // Added useState
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Loader } from "@/components/ui/loader";

export default function HomePage() {
  const { user, loading: authContextLoading } = useAuth(); // Renamed to avoid conflict
  const router = useRouter();
  const [isInitialAuthCheck, setIsInitialAuthCheck] = useState(true);

  useEffect(() => {
    if (!authContextLoading) {
      setIsInitialAuthCheck(false); // Mark initial check as done
      if (user) {
        router.replace("/dashboard");
      }
    }
  }, [user, authContextLoading, router]);

  // Show loader only during the very first auth state check
  if (isInitialAuthCheck && authContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
      </div>
    );
  }

  // If user object is present (regardless of initial check status), redirect.
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
  // render the LoginForm.
  return <LoginForm />;
}
