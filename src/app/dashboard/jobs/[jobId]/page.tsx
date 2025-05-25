
// src/app/dashboard/jobs/[jobId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/contexts/AppContext';
import type { Job, JobApplication } from '@/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, FileText, Users, XCircle, CheckCircle, Clock, CalendarDays, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { getJobById, fetchApplicationsForJob, loadingData: contextLoading } = useAppContext();

  const jobId = typeof params.jobId === 'string' ? params.jobId : undefined;

  const [job, setJob] = useState<Job | null | undefined>(undefined); // undefined initially, null if not found
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);

  useEffect(() => {
    if (jobId) {
      setLoadingJob(true);
      const foundJob = getJobById(jobId);
      setJob(foundJob); // Will be undefined if not found in current context jobs
      setLoadingJob(false); // Stop loading once attempt is made

      if (foundJob) { // Only fetch apps if job is found
        setLoadingApplications(true);
        fetchApplicationsForJob(jobId)
          .then(setApplications)
          .catch(err => {
            console.error("Failed to fetch applications for job:", err);
            setApplications([]); // Set to empty on error
          })
          .finally(() => setLoadingApplications(false));
      } else {
        setLoadingApplications(false); // No job, no apps to load
        setApplications([]);
      }
    } else {
      setJob(null); // No jobId, so job is not found
      setLoadingJob(false);
      setLoadingApplications(false);
    }
  }, [jobId, getJobById, fetchApplicationsForJob]);

  const totalApplications = applications.length;
  const rejectedApplicationsCount = applications.filter(app => app.status.startsWith('rejected_')).length;
  const underProcessApplicationsCount = totalApplications - rejectedApplicationsCount;

  const isLoading = contextLoading || loadingJob || loadingApplications;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (job === null || job === undefined) { // Explicitly check for undefined too for initial state
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Job Not Found</AlertTitle>
          <AlertDescription>The job details could not be loaded or the job does not exist.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Listings
          </Link>
        </Button>
      </div>
    );
  }
  

  return (
    <div className="space-y-6">
      <Button asChild variant="outline">
        <Link href="/dashboard/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Listings
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-center gap-3 mb-2">
             <Briefcase className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">{job.title}</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-2 text-md">
            <CalendarDays size={16} /> Posted on: {format(new Date(job.createdAt), "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><FileText /> Job Description</h3>
            <div className="p-4 bg-background border rounded-md prose dark:prose-invert max-w-none whitespace-pre-line max-h-[500px] overflow-y-auto">
              {job.description}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Application Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary"><Users /> Total Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totalApplications}</p>
                </CardContent>
              </Card>
              <Card className="bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive"><XCircle /> Rejected Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{rejectedApplicationsCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-500"><Clock /> Applications Under Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{underProcessApplicationsCount}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">These statistics are based on applications received for this job posting.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

