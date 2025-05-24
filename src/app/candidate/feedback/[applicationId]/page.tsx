// src/app/candidate/feedback/[applicationId]/page.tsx
"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function CandidateFeedbackPage() {
  const params = useParams();
  const applicationId = params.applicationId as string; // Assuming it's always a string

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
       <Button asChild variant="outline" className="absolute top-20 left-6 sm:top-24 sm:left-10">
        <Link href="/candidate/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <Card className="w-full max-w-lg shadow-xl p-6 sm:p-8">
        <CardHeader className="items-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-bold">Thank You!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground mt-2">
            Your questionnaire has been submitted successfully.
          </p>
          <p className="text-md text-muted-foreground mt-4">
            You will receive an update on your application status via email shortly.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/candidate/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
