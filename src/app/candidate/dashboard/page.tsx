
// src/app/candidate/dashboard/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Briefcase, UserCircle } from 'lucide-react';

export default function CandidateDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
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
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome, {userCandidateProfile?.candidateName || user.displayName || user.email || 'Candidate'}!</CardTitle>
          <CardDescription className="text-lg">
            Manage your profile, upload your resume, and explore job opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="mb-6">Your journey with TalentFlow AI starts here. Prepare your resume and find the perfect job.</p>
          
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
