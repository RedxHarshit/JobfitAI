
// src/types/index.ts
import type { ParseResumeOutput } from "@/ai/flows/parse-resume";
import type { MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";

export interface InterviewQuestionCategory {
  category: string;
  questions: string[];
}

export interface Candidate extends ParseResumeOutput {
  id: string;
  userId: string; // To associate with the Firebase User UID
  resumeFileName?: string;
  parsedText?: string; // Full text of the resume if needed later
  matchData?: MatchCandidateToJobOutput & { jobId: string | null }; // jobId can be null if custom
  interviewQuestions?: InterviewQuestionCategory[]; // Updated structure
}

export interface Job {
  id:string;
  userId: string; // To associate with the Firebase User UID
  title: string;
  description: string;
  createdAt: Date;
}

    