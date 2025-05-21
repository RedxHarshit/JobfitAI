// src/types/index.ts
import type { ParseResumeOutput } from "@/ai/flows/parse-resume";
import type { MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";

export interface Candidate extends ParseResumeOutput {
  id: string;
  resumeFileName?: string;
  parsedText?: string; // Full text of the resume if needed later
  matchData?: MatchCandidateToJobOutput & { jobId: string };
  interviewQuestions?: string[]; // Array of questions
}

export interface Job {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
}
