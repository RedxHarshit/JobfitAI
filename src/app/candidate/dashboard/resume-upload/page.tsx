
// src/app/candidate/dashboard/resume-upload/page.tsx
"use client";

import { ResumeUploadForm } from "@/components/candidates/ResumeUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CandidateResumeUploadPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    // This should ideally be handled by the layout or parent pages, but good to have a fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>You need to be logged in to upload a resume.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/candidate/login">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Login
          </Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <Button asChild variant="outline" className="mb-6">
        <Link href="/candidate/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidate Dashboard
        </Link>
      </Button>
      <ResumeUploadForm 
        isCandidateMode={true}
        candidateUserId={user.uid}
        candidateAuthDisplayName={user.displayName || ""}
        candidateAuthEmail={user.email || ""}
      />
    </div>
  );
}
