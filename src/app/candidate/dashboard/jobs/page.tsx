
// src/app/candidate/dashboard/jobs/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, ArrowLeft, PlayCircle, LoaderIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Loader } from '@/components/ui/loader';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Job } from '@/types';
import { useState } from 'react';

export default function CandidateJobsPage() {
  const { user } = useAuth();
  const { jobs, loadingData, startJobApplication, userCandidateProfile } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const [startingApplicationJobId, setStartingApplicationJobId] = useState<string | null>(null);

  const handleStartApplication = async (job: Job) => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to start an application.", variant: "destructive" });
      router.push('/candidate/login');
      return;
    }
    if (!userCandidateProfile || !userCandidateProfile.resumeFileName) {
        toast({
            title: "Resume Required",
            description: "Please upload your resume before starting an application.",
            variant: "destructive",
            action: <Button onClick={() => router.push('/candidate/dashboard/resume-upload')}>Upload Resume</Button>
        });
        return;
    }

    setStartingApplicationJobId(job.id);
    const applicationId = await startJobApplication(job);
    setStartingApplicationJobId(null);

    if (applicationId) {
      toast({ title: "Application Started!", description: `Proceed to the questionnaire for ${job.title}.` });
      router.push(`/candidate/questionnaire/${applicationId}`);
    } else {
      toast({ title: "Failed to Start Application", description: "Could not start the application process. Please try again.", variant: "destructive" });
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading available jobs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Available Job Postings</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/candidate/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="text-center py-12 shadow-md">
          <CardHeader>
            <Briefcase className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">No Jobs Posted Currently</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg mb-6">
              Please check back later for new job opportunities.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl truncate" title={job.title}>{job.title}</CardTitle>
                <CardDescription>
                  Posted on: {format(new Date(job.createdAt), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {job.description}
                </p>
              </CardContent>
              <CardFooter>
                 <Button 
                    onClick={() => handleStartApplication(job)} 
                    className="w-full"
                    disabled={startingApplicationJobId === job.id}
                  >
                  {startingApplicationJobId === job.id ? (
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                  )}
                  {startingApplicationJobId === job.id ? 'Starting...' : 'Start Application & Questionnaire'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
