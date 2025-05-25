
// src/app/candidate/dashboard/jobs/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, ArrowLeft, PlayCircle, LoaderIcon, CheckCircle, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Loader } from '@/components/ui/loader';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Job, JobApplication } from '@/types';
import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function CandidateJobsPage() {
  const { user } = useAuth();
  const { jobs, loadingData, startJobApplication, userCandidateProfile, allJobApplications } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const [startingApplicationJobId, setStartingApplicationJobId] = useState<string | null>(null);

  const candidateApplicationsMap = useMemo(() => {
    if (!user || !allJobApplications) return new Map<string, JobApplication>();
    const map = new Map<string, JobApplication>();
    allJobApplications
      .filter(app => app.candidateId === user.uid)
      .forEach(app => map.set(app.jobId, app));
    return map;
  }, [allJobApplications, user]);


  const handleStartOrViewApplication = async (job: Job, existingApplication?: JobApplication) => {
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

    if (existingApplication) {
      router.push(`/candidate/questionnaire/${existingApplication.id}`);
      return;
    }

    setStartingApplicationJobId(job.id);
    const { applicationId, isNew } = await startJobApplication(job);
    setStartingApplicationJobId(null);

    if (applicationId) {
      if (isNew) {
        toast({ title: "Application Started!", description: `Proceed to the questionnaire for ${job.title}.` });
      } else {
        // This case should ideally not be hit if existingApplication check above is robust,
        // but good to have for completeness if startJobApplication detects an existing one.
        toast({ title: "Application Already Exists", description: `Resuming application for ${job.title}.` });
      }
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
          <Link href="/candidate/dashboard" className="flex items-center"> {/* Ensure flex and items-center for link too */}
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"> {/* Adjusted grid for better single column view initially */}
          {jobs.map((job) => {
            const existingApplication = candidateApplicationsMap.get(job.id);
            const hasApplied = !!existingApplication;
            
            return (
              <Card key={job.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl truncate" title={job.title}>{job.title}</CardTitle>
                  <CardDescription>
                    Posted on: {format(new Date(job.createdAt), "PPP")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="job-description">
                      <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline py-2">
                         <BookOpen className="mr-2 h-4 w-4" /> View Full Job Description
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="mt-2 p-3 bg-muted/30 rounded-md prose dark:prose-invert max-w-none max-h-60 overflow-y-auto whitespace-pre-line text-sm">
                          {job.description}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
                <CardFooter>
                   <Button 
                      onClick={() => handleStartOrViewApplication(job, existingApplication)} 
                      className="w-full"
                      disabled={startingApplicationJobId === job.id}
                      variant={hasApplied ? "secondary" : "default"}
                    >
                    {startingApplicationJobId === job.id ? (
                      <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    ) : hasApplied ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    {startingApplicationJobId === job.id ? 'Starting...' 
                      : hasApplied ? (existingApplication?.status === 'questionnaire_completed' || existingApplication?.status.startsWith('rejected') || existingApplication?.status === 'under_review_hr' || existingApplication?.status === 'accepted' || existingApplication?.status === 'interview_scheduled' ? 'View Application Status' : 'Continue Application')
                      : 'Start Application & Questionnaire'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

