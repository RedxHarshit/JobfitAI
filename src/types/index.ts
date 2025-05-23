
// src/types/index.ts
import type { ParseResumeOutput } from "@/ai/flows/parse-resume";
import type { MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";

export interface InterviewQuestionCategory {
  category: string;
  questions: string[];
}

export interface Candidate extends ParseResumeOutput {
  id: string; // For HR-added candidates, this is Firestore's auto-ID. For candidates managing their own, this is their auth.uid.
  userId: string; // For HR-added, this is HR's auth.uid. For candidate-managed, this is candidate's auth.uid.
  resumeFileName?: string;
  parsedText?: string;
  matchData?: MatchCandidateToJobOutput & { jobId: string | null };
  interviewQuestions?: InterviewQuestionCategory[];
  profileLastUpdatedAt?: Date; // Timestamp for when the profile was last updated by the candidate
}

export interface Job {
  id:string;
  userId: string; // HR User UID who created the job
  title: string;
  description: string;
  createdAt: Date;
}
