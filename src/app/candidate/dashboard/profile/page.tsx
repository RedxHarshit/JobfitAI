
// src/app/candidate/dashboard/profile/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { CandidateSelfProfileView } from '@/components/candidates/CandidateSelfProfileView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CandidateProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { userCandidateProfile, loadingData: appLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/candidate/login');
    }
    if (!authLoading && user && !user.emailVerified) {
        router.replace('/candidate/login?reason=unverified');
    }
  }, [user, authLoading, router]);

  const loading = authLoading || appLoading;

  if (loading || !user || (user && !user.emailVerified)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline">
        <Link href="/candidate/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Your Profile</CardTitle>
          </div>
          <CardDescription>Review the information extracted from your latest resume.</CardDescription>
        </CardHeader>
        <CardContent>
          {userCandidateProfile ? (
            <CandidateSelfProfileView candidate={userCandidateProfile} />
          ) : (
            <Alert>
              <AlertTitle>No Profile Data Found</AlertTitle>
              <AlertDescription>
                It seems we don't have your profile information yet. Please upload your resume to get started.
                <Button asChild variant="link" className="p-0 h-auto ml-1">
                  <Link href="/candidate/dashboard/resume-upload">Upload Resume</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
