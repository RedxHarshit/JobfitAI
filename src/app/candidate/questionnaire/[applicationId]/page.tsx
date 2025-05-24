
// src/app/candidate/questionnaire/[applicationId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import type { JobApplication, AIQuestion } from '@/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Lightbulb, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
// import { generateQuestionnaireForApplication } from '@/ai/flows/generate-questionnaire'; // We will create this flow later

export default function CandidateQuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { getJobApplicationById, updateJobApplication, userCandidateProfile } = useAppContext();
  
  const applicationId = typeof params.applicationId === 'string' ? params.applicationId : undefined;
  
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [generatingQuestions, setGeneratingQuestions] = useState(false);
  // const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!applicationId) {
      setError("Application ID is missing.");
      setLoading(false);
      return;
    }

    const fetchApplication = async () => {
      setLoading(true);
      setError(null);
      try {
        const appData = await getJobApplicationById(applicationId);
        if (!appData) {
          setError("Application not found.");
          setApplication(null);
        } else {
          setApplication(appData);
          // TODO: Add logic to check if questions need to be generated
          // if (appData.status === 'questionnaire_pending' && !appData.questions?.length) {
          //   handleGenerateQuestions(appData);
          // }
        }
      } catch (e: any) {
        setError(e.message || "Failed to load application details.");
        setApplication(null);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, getJobApplicationById]);

  // Placeholder for AI question generation
  // const handleGenerateQuestions = async (appData: JobApplication) => {
  //   if (!userCandidateProfile?.parsedText || !appData.jobDescription) {
  //     setError("Cannot generate questions: Candidate profile or job description is missing.");
  //     return;
  //   }
  //   setGeneratingQuestions(true);
  //   try {
  //     const generatedQuestions = await generateQuestionnaireForApplication({
  //       candidateResumeText: userCandidateProfile.parsedText,
  //       jobDescription: appData.jobDescription,
  //     });
      
  //     if (generatedQuestions && generatedQuestions.length > 0) {
  //       const questionsWithIds: AIQuestion[] = generatedQuestions.map((qText, idx) => ({ id: `q_${idx}_${Date.now()}`, text: qText }));
  //       await updateJobApplication(applicationId!, { questions: questionsWithIds, status: 'questionnaire_in_progress', questionnaireGeneratedAt: new Date() });
  //       setApplication(prev => prev ? { ...prev, questions: questionsWithIds, status: 'questionnaire_in_progress' } : null);
  //     } else {
  //       setError("AI failed to generate questions. Please try again or contact support.");
  //     }
  //   } catch (e: any) {
  //     setError(e.message || "Error generating questionnaire.");
  //   } finally {
  //     setGeneratingQuestions(false);
  //   }
  // };

  // const handleAnswerChange = (questionId: string, answerText: string) => {
  //   setAnswers(prev => ({ ...prev, [questionId]: answerText }));
  // };

  // const handleSubmitQuestionnaire = async () => {
  //   // TODO: Save answers to Firestore
  //   // Update application status to 'questionnaire_completed'
  //   // Navigate to a thank you page
  //   console.log("Submitting questionnaire with answers:", answers);
  //   await updateJobApplication(applicationId!, { status: 'questionnaire_completed', questionnaireCompletedAt: new Date(), answers: Object.entries(answers).map(([qid, ans]) => ({questionId: qid, answerText: ans})) });
  //   router.push(`/candidate/feedback/${applicationId}`);
  // };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading questionnaire...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/candidate/dashboard/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Link>
        </Button>
      </div>
    );
  }

  if (!application) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Alert className="max-w-md">
          <AlertTitle>Application Not Found</AlertTitle>
          <AlertDescription>The application details could not be loaded.</AlertDescription>
        </Alert>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/candidate/dashboard/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="outline">
        <Link href="/candidate/dashboard/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Listings
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-primary" />
            <div>
                <CardTitle className="text-3xl">Job Questionnaire</CardTitle>
                <CardDescription className="text-lg">For: {application.jobTitle}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* {generatingQuestions && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader size={32} />
              <p className="mt-2 text-muted-foreground">Generating your personalized questions...</p>
            </div>
          )} */}
          
          {/* Placeholder for actual questionnaire UI */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Questionnaire Coming Soon!</AlertTitle>
            <AlertDescription>
              The AI-powered questionnaire for this job application is under development. 
              For now, your application for "{application.jobTitle}" has been noted.
              We will implement question generation and answering in the next phase.
            </AlertDescription>
          </Alert>

          {/* Example of how questions might be displayed later
          {application.questions && application.questions.length > 0 && !generatingQuestions && (
            <div className="space-y-6">
              <p>Please answer the following questions to the best of your ability.</p>
              {application.questions.map((q, index) => (
                <div key={q.id} className="p-4 border rounded-md bg-muted/30">
                  <Label htmlFor={q.id} className="text-md font-semibold mb-2 block">Question {index + 1}: {q.text}</Label>
                  <Textarea 
                    id={q.id} 
                    rows={4} 
                    placeholder="Your answer..." 
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  />
                </div>
              ))}
              <Button onClick={handleSubmitQuestionnaire} size="lg" className="w-full">
                <Send className="mr-2 h-5 w-5" /> Submit Questionnaire
              </Button>
            </div>
          )}
          */}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Your application status is currently: <strong>{application.status.replace(/_/g, ' ')}</strong>.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
