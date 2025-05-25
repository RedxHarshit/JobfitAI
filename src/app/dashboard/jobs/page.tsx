
// src/app/dashboard/jobs/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { Briefcase, PlusCircle, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Loader } from '@/components/ui/loader';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Job } from '@/types';

export default function JobsPage() {
  const { jobs, loadingData, deleteJob } = useAppContext();
  const { toast } = useToast();
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    const success = await deleteJob(jobToDelete.id);
    if (success) {
      toast({
        title: "Job Deleted",
        description: `The job "${jobToDelete.title}" has been removed.`,
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: "Could not delete job. Please try again.",
        variant: "destructive",
      });
    }
    setJobToDelete(null);
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Job Postings</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="text-center py-12 shadow-md">
          <CardHeader>
            <Briefcase className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">No Jobs Posted Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg mb-6">
              Start by adding a new job posting. Your created jobs will appear here.
            </CardDescription>
            <Button asChild size="lg">
              <Link href="/dashboard/jobs/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Job
              </Link>
            </Button>
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
              <CardFooter className="flex justify-between items-center gap-2">
                <Button variant="outline" className="flex-grow" disabled>
                  <Eye className="mr-2 h-4 w-4" /> View Details (Coming Soon)
                </Button>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => setJobToDelete(job)}
                  aria-label="Delete job"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            {jobToDelete && (
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the job posting
                for "{jobToDelete.title}". This might also affect any candidates matched to this job.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Yes, delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

