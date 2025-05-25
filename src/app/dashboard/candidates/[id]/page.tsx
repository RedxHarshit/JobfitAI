// src/app/dashboard/candidates/[id]/page.tsx
"use client"; // This page needs to be a client component to use hooks like useParams / useRouter for ID

import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { CandidateProfileClient } from '@/components/candidates/CandidateProfileClient';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { getCandidateById } = useAppContext();
  
  const candidateId = typeof params.id === 'string' ? params.id : undefined;
  const candidate = candidateId ? getCandidateById(candidateId) : undefined;

  if (!candidateId) {
    // Should not happen with proper routing, but good for robustness
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Candidate ID is missing.</AlertDescription>
        </Alert>
         <Button onClick={() => router.back()} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
      </div>
    );
  }
  
  if (!candidate) {
     // Data might still be loading or candidate not found
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading candidate data or candidate not found...</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/candidates">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/candidates">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates List
        </Link>
      </Button>
      <CandidateProfileClient candidate={candidate} />
    </div>
  );
}
