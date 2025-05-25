
// src/components/candidates/CandidateProfileClient.tsx
"use client";

import type { Candidate, Job, InterviewQuestionCategory, JobApplication, CandidateOverallStatus, InterviewDetails } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation"; 
import { matchCandidateToJob, type MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";
import { generateInterviewQuestions } from "@/ai/flows/generate-interview-questions";
import { UserCircle, FileText, Briefcase, Lightbulb, Sparkles, Brain, AlertTriangle, Trash2, CheckCircle, XCircle, Send, ExternalLink, Clock, Edit3, History, PackageCheck, PackageX, Handshake, MessageSquare, UserCheck, UserX, FileQuestion, CalendarClock } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ScheduleInterviewDialog } from "@/components/applications/ScheduleInterviewDialog"; // New Import

interface CandidateProfileClientProps {
  candidate: Candidate;
}

export function CandidateProfileClient({ candidate: initialCandidate }: CandidateProfileClientProps) {
  const { user } = useAuth();
  const { jobs, getJobById, updateCandidate, deleteCandidate, fetchApplicationsForCandidate, hrUpdateApplicationStatus, hrUpdateCandidateOverallStatus, getCandidateById } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate>(initialCandidate);
   useEffect(() => {
    setCandidate(initialCandidate); 
  }, [initialCandidate]);

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(candidate.matchData?.jobId ?? undefined);
  const [customJobDescription, setCustomJobDescription] = useState<string>("");
  const [useCustomJob, setUseCustomJob] = useState<boolean>(!candidate.matchData?.jobId && !!candidate.matchData); 
  
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchCandidateToJobOutput | null>(candidate.matchData || null);
  
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const initialInterviewQuestions = Array.isArray(candidate.interviewQuestions) &&
                                candidate.interviewQuestions.every(q => typeof q === 'object' && q.category && Array.isArray(q.questions))
                                ? candidate.interviewQuestions
                                : [];
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestionCategory[]>(initialInterviewQuestions);

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [hrActionLoading, setHrActionLoading] = useState<Record<string, boolean>>({}); 
  const [overallStatusLoading, setOverallStatusLoading] = useState(false);
  const [isScheduleInterviewDialogOpen, setIsScheduleInterviewDialogOpen] = useState(false);
  const [applicationToSchedule, setApplicationToSchedule] = useState<JobApplication | null>(null);


  const candidateResumeText = useMemo(() => {
    let text = `Candidate Name: ${candidate.candidateName || 'N/A'}\n`;
    if (candidate.email) text += `Email: ${candidate.email}\n`;
    if (candidate.phone) text += `Phone: ${candidate.phone}\n`;
    text += `Skills: ${(candidate.skills || []).join(", ")}\n\n`;
    text += `Experience:\n${(candidate.experience || []).join("\n")}\n\n`;
    text += `Education:\n${(candidate.education || []).join("\n")}\n`;
    return text;
  }, [candidate]);

  useEffect(() => {
    if (candidate.matchData?.jobId) {
        setSelectedJobId(candidate.matchData.jobId);
        const job = getJobById(candidate.matchData.jobId);
        if(job) setCustomJobDescription(job.description);
        setUseCustomJob(false);
    } else if (candidate.matchData) { 
        setUseCustomJob(true);
    }
    const updatedInitialQuestions = Array.isArray(candidate.interviewQuestions) &&
                                  candidate.interviewQuestions.every(q => typeof q === 'object' && q.category && Array.isArray(q.questions))
                                  ? candidate.interviewQuestions
                                  : [];
    setInterviewQuestions(updatedInitialQuestions);
  }, [candidate.matchData, candidate.interviewQuestions, getJobById]);

  const stableFetchApplications = useCallback(fetchApplicationsForCandidate, []); // Removed fetchApplicationsForCandidate from deps
  useEffect(() => {
    if (candidate && candidate.id) {
      setLoadingApplications(true);
      stableFetchApplications(candidate.id)
        .then(setApplications)
        .catch(err => {
          console.error("Failed to fetch applications:", err);
          toast({ title: "Error", description: "Could not load job applications.", variant: "destructive" });
        })
        .finally(() => setLoadingApplications(false));
    }
  }, [candidate, stableFetchApplications, toast]);


  const handleMatchCandidate = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const jobDescriptionToUse = useCustomJob ? customJobDescription : (selectedJobId ? getJobById(selectedJobId)?.description : "");

    if (!jobDescriptionToUse) {
      toast({ title: "Job Description Missing", description: "Please select a job or provide a custom job description.", variant: "destructive" });
      return;
    }
    if (!candidateResumeText) {
      toast({ title: "Resume Data Missing", description: "Candidate resume data is not available for matching.", variant: "destructive" });
      return;
    }

    setMatchLoading(true);
    try {
      const result = await matchCandidateToJob({
        resumeText: candidateResumeText,
        jobDescription: jobDescriptionToUse,
      });
      setMatchResult(result);
      const updatedCandidateData: Candidate = { 
        ...candidate, 
        matchData: { ...result, jobId: useCustomJob ? undefined : selectedJobId! }, 
        userId: candidate.userId 
      };
      await updateCandidate(updatedCandidateData); 
      setCandidate(prev => ({...prev, matchData: updatedCandidateData.matchData}));
      toast({ title: "Matching Complete!", description: `Match score: ${Math.round(result.matchScore * 100)}%` });
    } catch (error: any) {
      toast({ title: "Matching Error", description: error.message || "Failed to match candidate.", variant: "destructive" });
    } finally {
      setMatchLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
     if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const jobDescriptionToUse = matchResult && candidate.matchData?.jobId && getJobById(candidate.matchData.jobId)?.description || customJobDescription || (selectedJobId ? getJobById(selectedJobId)?.description : "");

    if (!jobDescriptionToUse) {
      toast({ title: "Job Description Missing", description: "Please match with a job or provide a job description first.", variant: "destructive" });
      return;
    }
     if (!candidateResumeText) {
      toast({ title: "Candidate Profile Missing", description: "Candidate profile data is not available for generating questions.", variant: "destructive" });
      return;
    }

    setQuestionsLoading(true);
    try {
      const result = await generateInterviewQuestions({
        candidateProfile: candidateResumeText,
        jobRequirements: jobDescriptionToUse,
      });
      setInterviewQuestions(result.structuredQuestions); 
      const updatedCandidateData: Candidate = { 
        ...candidate, 
        interviewQuestions: result.structuredQuestions, 
        userId: candidate.userId 
      };
      await updateCandidate(updatedCandidateData);
      setCandidate(prev => ({...prev, interviewQuestions: result.structuredQuestions}));
      toast({ title: "Interview Questions Generated!", description: "Insightful questions are ready for your review." });
    } catch (error: any) {
      toast({ title: "Question Generation Error", description: error.message || "Failed to generate questions.", variant: "destructive" });
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const success = await deleteCandidate(candidate.id);
    if (success) {
      toast({ title: "Candidate Deleted", description: `${candidate.candidateName} has been removed.` });
      router.push("/dashboard/candidates"); 
    } else {
      toast({ title: "Deletion Failed", description: "Could not delete the candidate. Please try again.", variant: "destructive" });
    }
  };

  const handleOpenScheduleDialog = (app: JobApplication) => {
    setApplicationToSchedule(app);
    setIsScheduleInterviewDialogOpen(true);
  };

  const handleScheduleInterviewSubmit = async (interviewDetails: InterviewDetails) => {
    if (!applicationToSchedule) return;
    setHrActionLoading(prev => ({ ...prev, [applicationToSchedule.id]: true }));
    
    const success = await hrUpdateApplicationStatus(
      applicationToSchedule.id, 
      'interview_scheduled', 
      applicationToSchedule.candidateEmailSnapshot || "", 
      applicationToSchedule.candidateNameSnapshot || "", 
      applicationToSchedule.jobTitle,
      interviewDetails
    );

    if (success) {
      toast({ title: "Interview Scheduled", description: `Interview scheduled for ${applicationToSchedule.candidateNameSnapshot} for ${applicationToSchedule.jobTitle}.` });
      setApplications(prevApps => prevApps.map(a => 
        a.id === applicationToSchedule.id 
        ? { ...a, status: 'interview_scheduled', reviewedByHrAt: new Date(), interviewDetails: interviewDetails } 
        : a
      ));
      // Update candidate's overall status
      await hrUpdateCandidateOverallStatus(applicationToSchedule.candidateId, 'interview_scheduled', {
        name: applicationToSchedule.candidateNameSnapshot,
        email: applicationToSchedule.candidateEmailSnapshot,
      });
      // Fetch the latest candidate data to update the overall status badge
      const updatedCand = await getCandidateById(applicationToSchedule.candidateId);
      if(updatedCand) setCandidate(updatedCand);

    } else {
      toast({ title: "Scheduling Failed", description: "Could not schedule interview.", variant: "destructive" });
    }
    setHrActionLoading(prev => ({ ...prev, [applicationToSchedule.id]: false }));
    setApplicationToSchedule(null);
  };

  const handleRejectApplication = async (app: JobApplication) => {
    setHrActionLoading(prev => ({ ...prev, [app.id]: true }));
    const success = await hrUpdateApplicationStatus(
      app.id, 
      'rejected_hr', 
      app.candidateEmailSnapshot || "", 
      app.candidateNameSnapshot || "", 
      app.jobTitle
    );
    if (success) {
      toast({ title: "Application Rejected", description: `Application for ${app.jobTitle} has been rejected.` });
      setApplications(prevApps => prevApps.map(a => a.id === app.id ? { ...a, status: 'rejected_hr', reviewedByHrAt: new Date() } : a));
      // Optionally update candidate's overall status if this was the only active application etc.
      // For now, hrUpdateCandidateOverallStatus is handled separately or upon specific overall rejection.
    } else {
      toast({ title: "Rejection Failed", description: "Could not reject application.", variant: "destructive" });
    }
    setHrActionLoading(prev => ({ ...prev, [app.id]: false }));
  };

  const handleOverallCandidateStatusChange = async (newStatus: CandidateOverallStatus) => {
    setOverallStatusLoading(true);
    const success = await hrUpdateCandidateOverallStatus(candidate.id, newStatus, { email: candidate.email, name: candidate.candidateName });
    if (success) {
      toast({ title: "Candidate Status Updated", description: `${candidate.candidateName}'s status changed to ${newStatus.replace(/_/g, ' ')}.` });
      setCandidate(prev => ({ ...prev, overallStatus: newStatus, overallStatusLastUpdatedAt: new Date() }));
    } else {
      toast({ title: "Status Update Failed", description: "Could not update candidate's overall status.", variant: "destructive" });
    }
    setOverallStatusLoading(false);
  };

  const matchScorePercentage = matchResult ? Math.round(matchResult.matchScore * 100) : 0;
  const overallStatusOptions: CandidateOverallStatus[] = ['new', 'under_review_hr', 'contacted', 'interview_scheduled', 'offer_extended', 'hired', 'rejected_overall'];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4 bg-muted/30 p-6">
          <div className="flex items-center gap-4">
            <Image 
              src={`https://placehold.co/100x100.png?text=${candidate.candidateName ? candidate.candidateName.charAt(0).toUpperCase() : 'C'}`} 
              alt={candidate.candidateName || "Candidate"} 
              width={100} 
              height={100} 
              className="rounded-full border-4 border-background shadow-md"
              data-ai-hint="person avatar"
            />
            <div>
              <CardTitle className="text-3xl font-bold">{candidate.candidateName || "N/A"}</CardTitle>
              {candidate.email && <CardDescription className="text-lg">{candidate.email}</CardDescription>}
              {candidate.phone && <CardDescription className="text-md">{candidate.phone}</CardDescription>}
              {candidate.resumeFileName && <CardDescription className="text-sm text-muted-foreground italic mt-1">Resume: {candidate.resumeFileName}</CardDescription>}
              {candidate.overallStatus && (
                <Badge 
                  variant={
                    candidate.overallStatus === 'hired' ? 'default' 
                    : candidate.overallStatus === 'rejected_overall' ? 'destructive' 
                    : candidate.overallStatus === 'interview_scheduled' ? 'secondary'
                    : 'outline'
                  } 
                  className="mt-2 text-sm capitalize"
                >
                  Overall Status: {candidate.overallStatus.replace(/_/g, ' ')}
                </Badge>
              )}
               {candidate.overallStatusLastUpdatedAt && (
                <p className="text-xs text-muted-foreground italic mt-1">
                    Status Updated: {format(new Date(candidate.overallStatusLastUpdatedAt), "PPP p")}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Candidate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the candidate
                      profile for {candidate.candidateName || "this candidate"}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCandidate} className="bg-destructive hover:bg-destructive/90">
                      Yes, delete candidate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="w-full sm:w-auto">
                <Label htmlFor="overall-status-select" className="text-xs text-muted-foreground">Update Overall Status:</Label>
                <Select
                    value={candidate.overallStatus || 'new'}
                    onValueChange={(value) => handleOverallCandidateStatusChange(value as CandidateOverallStatus)}
                    disabled={overallStatusLoading}
                >
                    <SelectTrigger id="overall-status-select" className="w-full sm:w-auto">
                        <SelectValue placeholder="Set overall status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {overallStatusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                                {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              {overallStatusLoading && <Loader size={16} className="mt-1 self-center"/>}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile"><UserCircle className="mr-2" /> Profile Details</TabsTrigger>
          <TabsTrigger value="applications"><FileQuestion className="mr-2" /> Job Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="matching"><Brain className="mr-2" /> AI Matching</TabsTrigger>
          <TabsTrigger value="interview"><Lightbulb className="mr-2" /> Interview Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText /> Parsed Resume Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-primary">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {(candidate.skills || []).length > 0 ? candidate.skills.map((skill, i) => <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{skill}</Badge>) : <p className="text-sm text-muted-foreground">No skills extracted.</p>}
                </div>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="experience">
                  <AccordionTrigger className="text-primary font-semibold">Experience</AccordionTrigger>
                  <AccordionContent>
                    {(candidate.experience || []).length > 0 ? candidate.experience.map((exp, i) => <p key={i} className="mb-2 p-2 bg-muted/50 rounded-md text-sm whitespace-pre-line">{exp}</p>) : <p className="text-sm text-muted-foreground">No experience details extracted.</p>}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="education">
                  <AccordionTrigger className="text-primary font-semibold">Education</AccordionTrigger>
                  <AccordionContent>
                    {(candidate.education || []).length > 0 ? candidate.education.map((edu, i) => <p key={i} className="mb-2 p-2 bg-muted/50 rounded-md text-sm whitespace-pre-line">{edu}</p>) : <p className="text-sm text-muted-foreground">No education details extracted.</p>}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> Candidate's Job Applications</CardTitle>
                    <CardDescription>Review applications submitted by {candidate.candidateName || "this candidate"}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingApplications ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader size={32} />
                            <p className="ml-2 text-muted-foreground">Loading applications...</p>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-10">
                            <FileQuestion size={48} className="mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No job applications found for this candidate.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {applications.map(app => (
                                <Card key={app.id} className="shadow-sm">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">{app.jobTitle}</CardTitle>
                                                <CardDescription>Applied on: {format(new Date(app.appliedAt), "PPP")}</CardDescription>
                                            </div>
                                            <Badge variant={
                                                app.status === 'accepted' || app.status === 'hired' || app.status === 'interview_scheduled' ? 'default' 
                                                : app.status.startsWith('rejected') ? 'destructive' 
                                                : app.status === 'under_review_hr' ? 'secondary'
                                                : 'outline'
                                            } className="capitalize text-xs px-2 py-1">
                                                {app.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {app.score !== undefined && (
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold">AI Score:</span>
                                                <Progress value={app.score} className="w-1/2 h-2.5" />
                                                <span className="text-sm font-bold text-primary">{app.score}%</span>
                                            </div>
                                        )}
                                        {app.scoreJustification && (
                                            <div>
                                                <h4 className="font-semibold text-sm">AI Justification:</h4>
                                                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{app.scoreJustification}</p>
                                            </div>
                                        )}
                                         {app.status === 'interview_scheduled' && app.interviewDetails && (
                                          <Card className="bg-muted/50 p-3">
                                            <CardTitle className="text-sm flex items-center gap-2 mb-1"><CalendarClock size={16} className="text-primary"/> Interview Scheduled</CardTitle>
                                            <p className="text-xs"><strong>Date:</strong> {app.interviewDetails.date}</p>
                                            <p className="text-xs"><strong>Time:</strong> {app.interviewDetails.time}</p>
                                            {app.interviewDetails.notes && <p className="text-xs"><strong>Notes:</strong> {app.interviewDetails.notes}</p>}
                                          </Card>
                                        )}
                                        {app.questions && app.questions.length > 0 && (
                                          <Accordion type="single" collapsible className="w-full text-sm">
                                            <AccordionItem value="qna">
                                              <AccordionTrigger className="text-sm py-2">View Questionnaire & Answers</AccordionTrigger>
                                              <AccordionContent className="space-y-2 pt-2">
                                                {app.questions.map((q, idx) => (
                                                  <div key={q.id} className="p-2 bg-muted/30 rounded-md">
                                                    <p className="font-semibold text-xs">Q{idx+1}: {q.text}</p>
                                                    <p className="text-xs mt-1 text-muted-foreground">A: {app.answers?.find(a => a.questionId === q.id)?.answerText || "Not answered"}</p>
                                                  </div>
                                                ))}
                                              </AccordionContent>
                                            </AccordionItem>
                                          </Accordion>
                                        )}
                                    </CardContent>
                                    {app.status === 'under_review_hr' && (
                                        <CardFooter className="gap-2 justify-end">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleRejectApplication(app)}
                                                disabled={hrActionLoading[app.id]}
                                            >
                                                {hrActionLoading[app.id] ? <Loader size={16} className="mr-2" /> : <XCircle className="mr-2 h-4 w-4" />}
                                                Reject
                                            </Button>
                                            <Button 
                                                size="sm"
                                                onClick={() => handleOpenScheduleDialog(app)}
                                                disabled={hrActionLoading[app.id]}
                                            >
                                                 {hrActionLoading[app.id] ? <Loader size={16} className="mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                Accept & Schedule Interview
                                            </Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="matching" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles /> Candidate-Job Match Analysis</CardTitle>
              <CardDescription>Match this candidate against a job description using AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 items-start">
                <div>
                  <Label htmlFor="job-select" className="mb-1 block">Select Existing Job</Label>
                  <Select 
                    onValueChange={(value) => { 
                      setSelectedJobId(value); 
                      setUseCustomJob(false); 
                      const job = getJobById(value); 
                      if (job) setCustomJobDescription(job.description); 
                    }} 
                    value={useCustomJob ? "" : selectedJobId} 
                    disabled={useCustomJob}
                  >
                    <SelectTrigger id="job-select">
                      <SelectValue placeholder="Choose a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map(job => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                    <Button 
                      variant={useCustomJob ? "secondary" : "outline"} 
                      onClick={() => {
                        setUseCustomJob(true); 
                        setSelectedJobId(undefined);
                      }} 
                      className="w-full mb-2 mt-0 md:mt-6"
                    >
                        Or Use Custom Job Description
                    </Button>
                 </div>
              </div>
              
              {useCustomJob && (
                <div>
                  <Label htmlFor="custom-job-desc">Custom Job Description</Label>
                  <Textarea id="custom-job-desc" value={customJobDescription} onChange={(e) => setCustomJobDescription(e.target.value)} placeholder="Paste job description here..." rows={8} className="min-h-[150px]"/>
                </div>
              )}
              
              <Button onClick={handleMatchCandidate} disabled={matchLoading || (!selectedJobId && !useCustomJob) || (useCustomJob && !customJobDescription)} className="w-full md:w-auto">
                {matchLoading ? <Loader size={20} className="mr-2" /> : <Sparkles className="mr-2" />}
                {matchLoading ? "Analyzing Match..." : "Analyze Match with AI"}
              </Button>

              {matchResult && (
                <Card className="mt-4 bg-muted/30">
                  <CardHeader>
                    <CardTitle>Match Result</CardTitle>
                    <CardDescription>
                      For job: {useCustomJob ? "Custom Description" : (selectedJobId ? getJobById(selectedJobId)?.title : "N/A") }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4">
                       <span className="text-3xl font-bold text-primary">{matchScorePercentage}%</span>
                       <Progress value={matchScorePercentage} className="w-full h-3" />
                    </div>
                    <div>
                      <h4 className="font-semibold">AI Explanation:</h4>
                      <p className="text-sm whitespace-pre-line">{matchResult.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb /> AI-Generated Interview Questions</CardTitle>
              <CardDescription>Generate tailored interview questions based on the candidate's profile and job requirements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateQuestions} 
                disabled={questionsLoading || (!candidate.matchData && !customJobDescription && !selectedJobId)} 
                className="w-full md:w-auto"
              >
                {questionsLoading ? <Loader size={20} className="mr-2" /> : <Sparkles className="mr-2" />}
                {questionsLoading ? "Generating Questions..." : "Generate Questions with AI"}
              </Button>
              {(!candidate.matchData && !customJobDescription && !selectedJobId) && interviewQuestions.length === 0 && (
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400"/>
                    <div>
                      <p className="font-bold">Job Context Required</p>
                      <p className="text-sm">Please perform an "AI Matching" first, or select/provide a job description in that tab, before generating interview questions. This gives the AI context about the role.</p>
                    </div>
                  </div>
                </div>
              )}
              {interviewQuestions.length > 0 && (
                <Accordion type="multiple" className="w-full mt-4 space-y-2">
                  {interviewQuestions.map((categoryItem, index) => (
                    <AccordionItem value={`category-${index}`} key={index} className="bg-muted/30 rounded-md">
                      <AccordionTrigger className="text-md font-semibold px-4 py-3 hover:no-underline">
                        {categoryItem.category}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {categoryItem.questions.map((q, qIndex) => (
                            <li key={qIndex}>{q}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {applicationToSchedule && (
        <ScheduleInterviewDialog
          open={isScheduleInterviewDialogOpen}
          onOpenChange={setIsScheduleInterviewDialogOpen}
          onSubmit={handleScheduleInterviewSubmit}
          candidateName={applicationToSchedule.candidateNameSnapshot}
          jobTitle={applicationToSchedule.jobTitle}
        />
      )}
    </div>
  );
}
