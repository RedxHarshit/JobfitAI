
// src/components/candidates/CandidateProfileClient.tsx
"use client";

import type { Candidate, Job, InterviewQuestionCategory } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"; // For redirect after delete
import { matchCandidateToJob, type MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";
import { generateInterviewQuestions } from "@/ai/flows/generate-interview-questions";
import { UserCircle, FileText, Briefcase, Lightbulb, Sparkles, Brain, AlertTriangle, Trash2 } from "lucide-react";
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

interface CandidateProfileClientProps {
  candidate: Candidate;
}

export function CandidateProfileClient({ candidate }: CandidateProfileClientProps) {
  const { user } = useAuth();
  const { jobs, getJobById, updateCandidate, deleteCandidate } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(candidate.matchData?.jobId ?? undefined);
  const [customJobDescription, setCustomJobDescription] = useState<string>("");
  const [useCustomJob, setUseCustomJob] = useState<boolean>(!candidate.matchData?.jobId && !!candidate.matchData); 
  
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchCandidateToJobOutput | null>(candidate.matchData || null);
  
  const [questionsLoading, setQuestionsLoading] = useState(false);
  // Initialize with candidate's questions if they are in the new format, otherwise empty
  const initialInterviewQuestions = Array.isArray(candidate.interviewQuestions) &&
                                candidate.interviewQuestions.every(q => typeof q === 'object' && q.category && Array.isArray(q.questions))
                                ? candidate.interviewQuestions
                                : [];
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestionCategory[]>(initialInterviewQuestions);


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
     // Ensure interviewQuestions state updates if candidate prop changes (e.g., after initial load)
    const updatedInitialQuestions = Array.isArray(candidate.interviewQuestions) &&
                                  candidate.interviewQuestions.every(q => typeof q === 'object' && q.category && Array.isArray(q.questions))
                                  ? candidate.interviewQuestions
                                  : [];
    setInterviewQuestions(updatedInitialQuestions);
  }, [candidate.matchData, candidate.interviewQuestions, getJobById]);


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
        matchData: { ...result, jobId: useCustomJob ? null : selectedJobId! },
        userId: user.uid 
      };
      await updateCandidate(updatedCandidateData);
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
      setInterviewQuestions(result.structuredQuestions); // Use structuredQuestions
      const updatedCandidateData: Candidate = { 
        ...candidate, 
        interviewQuestions: result.structuredQuestions, // Store structuredQuestions
        userId: user.uid 
      };
      await updateCandidate(updatedCandidateData);
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
      router.push("/dashboard/candidates"); // Redirect to candidates list
    } else {
      toast({ title: "Deletion Failed", description: "Could not delete the candidate. Please try again.", variant: "destructive" });
    }
  };

  const matchScorePercentage = matchResult ? Math.round(matchResult.matchScore * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4 bg-muted/30 p-6">
          <div className="flex items-center gap-4">
            <Image 
              src={`https://placehold.co/100x100.png?text=${candidate.candidateName ? candidate.candidateName[0] : 'C'}`} 
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
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
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
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="profile"><UserCircle className="mr-2" /> Profile Details</TabsTrigger>
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
    </div>
  );
}

    