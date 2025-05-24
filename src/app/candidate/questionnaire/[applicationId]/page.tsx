
// src/app/candidate/questionnaire/[applicationId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import type { JobApplication, AIQuestion } from '@/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Lightbulb, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { generateQuestionnaireForApplication } from '@/ai/flows/generate-questionnaire';
import { scoreApplication } from '@/ai/flows/score-application';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // For getting user UID if needed for logs
// Removed Firestore imports for mail collection as we are reverting to simulation
// import { db } from '@/lib/firebase';
// import { collection, addDoc } from 'firebase/firestore';


export default function CandidateQuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { getJobApplicationById, updateJobApplication } = useAppContext();
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user

  const applicationId = typeof params.applicationId === 'string' ? params.applicationId : undefined;

  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const stableGetJobApplicationById = useCallback(getJobApplicationById, [getJobApplicationById]);
  const stableUpdateJobApplication = useCallback(updateJobApplication, [updateJobApplication]);

  useEffect(() => {
    if (!applicationId) {
      setError("Application ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    stableGetJobApplicationById(applicationId)
      .then(appData => {
        if (!appData) {
          setError("Application not found.");
          setApplication(null);
        } else {
          setApplication(appData);
          if (appData.answers && appData.answers.length > 0) {
            const initialAnswers: Record<string, string> = {};
            appData.answers.forEach(ans => {
              initialAnswers[ans.questionId] = ans.answerText;
            });
            setAnswers(initialAnswers);
          }
        }
      })
      .catch(e => {
        setError(e.message || "Failed to load application details.");
        setApplication(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [applicationId, stableGetJobApplicationById]);


  const handleGenerateQuestions = useCallback(async (
    appDataToGenerateFor: JobApplication,
    candidateResumeText: string,
    jobDesc: string
  ) => {
    if (!applicationId || generatingQuestions || !candidateResumeText || !jobDesc) {
      console.warn("[QuestionnairePage] Skipping question generation due to missing data or ongoing generation.", {applicationId, generatingQuestions, hasResume: !!candidateResumeText, hasJobDesc: !!jobDesc });
      if (!candidateResumeText || !jobDesc) {
        setError("Cannot generate questions: Candidate profile or job description is missing from the application snapshot.");
      }
      return;
    }

    console.log("[QuestionnairePage] Attempting to generate questions for app:", applicationId);
    setGeneratingQuestions(true);
    setError(null);
    try {
      const result = await generateQuestionnaireForApplication({
        candidateResumeText: candidateResumeText,
        jobDescription: jobDesc,
      });

      if (result && result.questions && result.questions.length > 0) {
        const questionsWithIds: AIQuestion[] = result.questions.map((qText, idx) => ({ id: `q_${idx}_${Date.now()}`, text: qText }));
        await stableUpdateJobApplication(applicationId, {
          questions: questionsWithIds,
          status: 'questionnaire_in_progress',
          questionnaireGeneratedAt: new Date()
        });
        setApplication(prev => prev ? { ...prev, questions: questionsWithIds, status: 'questionnaire_in_progress', questionnaireGeneratedAt: new Date() } : null);
        toast({ title: "Questions Generated", description: "Your personalized questionnaire is ready." });
      } else {
        setError("AI failed to generate questions. Please try again or contact support.");
        toast({ title: "Question Generation Failed", description: "Could not generate questions.", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("[QuestionnairePage] Error generating questionnaire:", e);
      setError(e.message || "Error generating questionnaire.");
      toast({ title: "Error", description: e.message || "Error generating questionnaire.", variant: "destructive" });
    } finally {
      setGeneratingQuestions(false);
      console.log("[QuestionnairePage] Finished question generation attempt for app:", applicationId);
    }
  }, [applicationId, stableUpdateJobApplication, toast, generatingQuestions]);


  useEffect(() => {
    if (application &&
        application.status === 'questionnaire_pending' &&
        (!application.questions || application.questions.length === 0) &&
        application.candidateResumeTextSnapshot &&
        application.jobDescription &&
        !generatingQuestions
    ) {
      handleGenerateQuestions(application, application.candidateResumeTextSnapshot, application.jobDescription);
    }
  }, [application, generatingQuestions, handleGenerateQuestions]);


  const handleAnswerChange = (questionId: string, answerText: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerText }));
  };

  const handleSubmitQuestionnaire = async () => {
    if (!applicationId || !application || !application.questions) {
        toast({ title: "Error", description: "Application data not loaded.", variant: "destructive" });
        return;
    }

    const allQuestionsAnswered = application.questions.every(q => answers[q.id] && answers[q.id].trim() !== '');
    if (!allQuestionsAnswered) {
      toast({
        title: "Incomplete Questionnaire",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    const formattedAnswers = Object.entries(answers).map(([qid, ans]) => ({questionId: qid, answerText: ans}));

    try {
      await stableUpdateJobApplication(applicationId, {
        answers: formattedAnswers,
        status: 'questionnaire_completed',
        questionnaireCompletedAt: new Date(),
      });
      console.log("[QuestionnairePage] Answers saved for app:", applicationId, "Status set to questionnaire_completed.");

      const resumeTextForScoring = application.candidateResumeTextSnapshot;
      const jobDescForScoring = application.jobDescription;
      const answersForScoring = formattedAnswers;
      const candidateEmailForNotification = application.candidateEmailSnapshot;

      console.log("[QuestionnairePage] Submitting questionnaire, preparing for AI scoring with inputs:", { resumeText: resumeTextForScoring ? 'Available' : 'MISSING', jobDescription: jobDescForScoring ? 'Available' : 'MISSING', answers: answersForScoring });

      if (!resumeTextForScoring || !jobDescForScoring || answersForScoring.length === 0) {
        console.error("[QuestionnairePage] Missing critical data for scoring", { resumeTextForScoring, jobDescForScoring, answersForScoring });
        throw new Error("Missing resume, job description, or answers for scoring. Cannot proceed with automated scoring.");
      }

      let finalStatus: JobApplication['status'] = 'under_review_hr'; 
      let scoreData: Partial<JobApplication> = {};

      try {
        console.log("[QuestionnairePage] ABOUT TO CALL scoreApplication...");
        const scoringResult = await scoreApplication({
          candidateResumeText: resumeTextForScoring,
          jobDescription: jobDescForScoring,
          questionnaireAnswers: answersForScoring.map(a => ({ questionText: application.questions?.find(q=>q.id === a.questionId)?.text || "", answerText: a.answerText })),
        });
        console.log("[QuestionnairePage] SUCCESSFULLY RETURNED FROM scoreApplication. Result:", scoringResult);

        if (scoringResult && typeof scoringResult.score === 'number') {
          scoreData.score = scoringResult.score;
          scoreData.scoreJustification = scoringResult.justification;
          if (scoringResult.score < 50) {
            finalStatus = 'rejected_auto';
            console.log(`[QuestionnairePage] Automated Rejection for App ID ${applicationId} (Candidate: ${candidateEmailForNotification || 'N/A'}): Score ${scoringResult.score}. Simulating rejection email.`);
            // SIMULATING EMAIL SENDING
          } else {
            finalStatus = 'under_review_hr';
            console.log(`[QuestionnairePage] Application for App ID ${applicationId} (Candidate: ${candidateEmailForNotification || 'N/A'}) scored ${scoringResult.score}. Status set to under_review_hr. Simulating HR notification.`);
            // SIMULATING HR NOTIFICATION
          }
        } else {
            console.error("[QuestionnairePage] Invalid scoring result from AI:", scoringResult);
            throw new Error("AI scoring did not return a valid score object.");
        }
      } catch (scoringError: any) {
        console.error("[QuestionnairePage] Error DIRECTLY FROM scoreApplication or during its processing:", scoringError);
        toast({ title: "Automated Scoring Failed", description: "Your application will be reviewed manually. " + (scoringError.message || "Unknown scoring error."), variant: "default", duration: 7000 });
        finalStatus = 'review_needed_scoring_failed'; 
        scoreData.score = undefined; 
        scoreData.scoreJustification = "Automated scoring failed: " + (scoringError.message || "Unknown error");
      }

      await stableUpdateJobApplication(applicationId, {
        status: finalStatus,
        ...scoreData,
      });
      console.log(`[QuestionnairePage] Final status for app ${applicationId} set to: ${finalStatus}`);

      toast({ title: "Questionnaire Submitted!", description: "Thank you for completing the questionnaire." });
      router.push(`/candidate/feedback/${applicationId}`);

    } catch (e: any) {
        console.error("[QuestionnairePage] Error submitting questionnaire or during scoring process:", e);
        setError(e.message || "Failed to submit questionnaire.");
        toast({ title: "Submission Failed", description: e.message || "Could not submit questionnaire.", variant: "destructive" });
    } finally {
        setSubmitting(false);
    }
  };


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

  if (application.status !== 'questionnaire_pending' && application.status !== 'questionnaire_in_progress') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-center">
         <Button asChild variant="outline" className="mb-6 mr-auto block">
            <Link href="/candidate/dashboard/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Listings
            </Link>
        </Button>
        <Card className="shadow-lg">
            <CardHeader>
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle className="text-2xl mt-4">Questionnaire Status: {application.status.replace(/_/g, ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You have already submitted or this questionnaire is past the pending stage for "{application.jobTitle}".</p>
                <p className="mt-2 text-muted-foreground">We will be in touch regarding the next steps if applicable.</p>
            </CardContent>
            <CardFooter className="justify-center">
                <Button asChild>
                    <Link href="/candidate/dashboard">Go to Dashboard</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>
    )
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
        <CardContent className="space-y-6">
          {generatingQuestions && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader size={32} />
              <p className="mt-2 text-muted-foreground">Generating your personalized questions...</p>
            </div>
          )}

          {application.questions && application.questions.length > 0 && !generatingQuestions && (
            <div className="space-y-6">
              <p>Please answer the following questions to the best of your ability.</p>
              {application.questions.map((q, index) => (
                <div key={q.id} className="p-4 border rounded-md bg-card">
                  <Label htmlFor={q.id} className="text-md font-semibold mb-2 block">Question {index + 1}: {q.text}</Label>
                  <Textarea
                    id={q.id}
                    rows={4}
                    placeholder="Your answer..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="bg-background"
                  />
                </div>
              ))}
              <Button onClick={handleSubmitQuestionnaire} size="lg" className="w-full" disabled={submitting || generatingQuestions}>
                {submitting ? <Loader size={20} className="mr-2"/> : <Send className="mr-2 h-5 w-5" />}
                {submitting ? "Submitting..." : "Submit Questionnaire"}
              </Button>
            </div>
          )}

          {!generatingQuestions && (!application.questions || application.questions.length === 0) && (application.status === 'questionnaire_pending' || application.status === 'questionnaire_in_progress') && (
             <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>No Questions Yet</AlertTitle>
                <AlertDescription>
                Questions for this application are not yet available. They might be generating.
                If this persists, please check back or contact support.
                </AlertDescription>
            </Alert>
          )}
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

