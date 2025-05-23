
// src/app/candidate/dashboard/jobs/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { Briefcase, Eye, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Loader } from '@/components/ui/loader';

export default function CandidateJobsPage() {
  const { jobs, loadingData } = useAppContext();

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
                 <Button variant="outline" className="w-full" disabled>
                  <Eye className="mr-2 h-4 w-4" /> View Details & Apply (Coming Soon)
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
