
// src/app/candidate/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Briefcase, UserCircle } from 'lucide-react';
import type { Candidate } from '@/types';

type ProfileVerificationStatus =
  | 'pending'         // Initial state
  | 'loading_auth'    // Waiting for authentication
  | 'loading_app_data'// Waiting for general app context data
  | 'verifying_profile'// Actively fetching/checking current user's profile
  | 'verified_has_resume'
  | 'verified_no_resume'
  | 'error_auth'
  | 'error_profile_fetch';

export default function CandidateDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    userCandidateProfile: contextProfile, // We'll use this as an initial hint
    loadingData: appContextLoading,
    fetchCandidateProfile,
  } = useAppContext();
  const router = useRouter();

  const [verificationStatus, setVerificationStatus] = useState<ProfileVerificationStatus>('pending');

  // Memoize fetchCandidateProfile from context
  const stableFetchCandidateProfile = useCallback(fetchCandidateProfile, []);

  useEffect(() => {
    if (authLoading) {
      setVerificationStatus('loading_auth');
      return;
    }

    if (!user) {
      setVerificationStatus('error_auth');
      router.replace('/candidate/login');
      return;
    }

    if (!user.emailVerified) {
      setVerificationStatus('error_auth');
      router.replace('/candidate/login?reason=unverified');
      return;
    }

    // User is authenticated and verified
    if (appContextLoading) {
      setVerificationStatus('loading_app_data');
      return;
    }

    // Auth and app data loaded, now verify the specific user's profile
    setVerificationStatus('verifying_profile');
    console.log("[DashboardPage] Auth & AppContext loaded. Explicitly verifying profile for user:", user.uid);

    stableFetchCandidateProfile(user.uid)
      .then((fetchedProfile: Candidate | null) => {
        if (fetchedProfile && fetchedProfile.resumeFileName) {
          console.log("[DashboardPage] Profile fetched, resume found:", fetchedProfile.resumeFileName);
          setVerificationStatus('verified_has_resume');
        } else {
          console.log("[DashboardPage] Profile fetched, no resume (or no profile). Profile:", fetchedProfile);
          setVerificationStatus('verified_no_resume');
        }
      })
      .catch((err) => {
        console.error("[DashboardPage] Error fetching candidate profile:", err);
        setVerificationStatus('error_profile_fetch');
        // Fallback to assuming no resume to be safe, error can be handled or logged
        // For now, this will lead to redirect to upload page.
      });

  }, [user, authLoading, appContextLoading, router, stableFetchCandidateProfile]);


  useEffect(() => {
    if (verificationStatus === 'verified_no_resume' || verificationStatus === 'error_profile_fetch') {
      console.log(`[DashboardPage] Verification status: ${verificationStatus}. Redirecting to resume upload.`);
      router.replace('/candidate/dashboard/resume-upload');
    }
  }, [verificationStatus, router]);

  const showLoader =
    verificationStatus === 'pending' ||
    verificationStatus === 'loading_auth' ||
    verificationStatus === 'loading_app_data' ||
    verificationStatus === 'verifying_profile' ||
    // Show loader even if redirecting, to avoid brief flash of dashboard
    verificationStatus === 'verified_no_resume' ||
    verificationStatus === 'error_profile_fetch';


  if (showLoader) {
    let message = "Loading dashboard...";
    if (verificationStatus === 'verifying_profile') message = "Verifying your profile...";
    if (verificationStatus === 'verified_no_resume' || verificationStatus === 'error_profile_fetch') message = "Please upload your resume to continue...";

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    );
  }

  // Only render dashboard if verification is complete and resume exists
  if (verificationStatus === 'verified_has_resume' && user) {
    // Use contextProfile for display, but decision was made on fetchedProfile
    const displayProfile = contextProfile && contextProfile.userId === user.uid ? contextProfile : null;

    return (
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Welcome, {displayProfile?.candidateName || user.displayName || user.email || 'Candidate'}!</CardTitle>
            <CardDescription className="text-lg">
              Manage your profile, upload your resume, and explore job opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="mb-6">Your journey with JobFit AI starts here. Prepare your resume and find the perfect job.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-8 w-8 text-primary" />
                    <CardTitle>Your Profile</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">View and verify your parsed resume information.</p>
                  <Button asChild className="w-full">
                    <Link href="/candidate/dashboard/profile">View Your Profile</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <CardTitle>Your Resume</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Keep your resume updated to get the best matches.</p>
                  <Button asChild className="w-full">
                    <Link href="/candidate/dashboard/resume-upload">Upload/Update Resume</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-8 w-8 text-primary" />
                    <CardTitle>Job Opportunities</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Browse jobs posted by recruiters and find your next role.</p>
                  <Button asChild className="w-full">
                    <Link href="/candidate/dashboard/jobs">View Available Jobs</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              We're excited to help you find your next opportunity!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback, should ideally not be reached if logic is correct, but good for safety
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Loader size={48} />
      <p className="mt-4 text-muted-foreground">An unexpected state occurred. Please refresh.</p>
    </div>
  );
}
