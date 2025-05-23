
// src/app/candidate/dashboard/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailWarning } from 'lucide-react';

export default function CandidateDashboardPage() {
  const { user, loading, signOut, sendVerificationEmail } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/candidate/login');
    }
    // If user exists but email is not verified, redirect them to login,
    // which will show the "verify email" message.
    if (!loading && user && !user.emailVerified) {
        router.replace('/candidate/login?reason=unverified');
    }
  }, [user, loading, router]);

  if (loading || !user || (user && !user.emailVerified)) { // Keep showing loader if email not verified to prevent flicker before redirect
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
      </div>
    );
  }

  // At this point, user is guaranteed to exist and be email verified.
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome, {user.displayName || user.email || 'Candidate'}!</CardTitle>
          <CardDescription className="text-lg">
            This is your candidate dashboard. Manage your applications and profile here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">Your journey with TalentFlow AI starts here. The next steps will involve uploading your resume, selecting a job, and completing an AI-powered questionnaire.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/candidate/dashboard/resume-upload">Upload Your Resume</Link>
            </Button>
             <Button asChild size="lg" variant="secondary" className="w-full" disabled>
              <Link href="#">View Available Jobs (Coming Soon)</Link>
            </Button>
            {/* Add more navigation or quick actions here */}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            We're excited to help you find your next opportunity!
          </p>
        </CardContent>
      </Card>
      {/* More content for the candidate dashboard can be added here */}
    </div>
  );
}
