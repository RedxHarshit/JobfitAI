
// src/types/index.ts
import type { ParseResumeOutput } from "@/ai/flows/parse-resume";
import type { MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";
import type { Timestamp } from "firebase/firestore";

export interface InterviewQuestionCategory {
  category: string;
  questions: string[];
}

export type CandidateOverallStatus = 
  | 'new' 
  | 'under_review_hr' 
  | 'contacted' 
  | 'interview_scheduled' 
  | 'offer_extended' 
  | 'hired' 
  | 'rejected_overall';

export interface Candidate extends ParseResumeOutput {
  id: string; 
  userId: string; 
  resumeFileName?: string;
  parsedText?: string; 
  matchData?: MatchCandidateToJobOutput & { jobId: string | null };
  interviewQuestions?: InterviewQuestionCategory[];
  profileLastUpdatedAt?: Date;
  overallStatus?: CandidateOverallStatus;
  overallStatusLastUpdatedAt?: Date | Timestamp;
}

export interface Job {
  id:string;
  userId: string; 
  title: string;
  description: string;
  createdAt: Date;
}

export interface AIQuestion {
  id: string; 
  text: string;
}

export type JobApplicationStatus = 
  | 'questionnaire_pending' 
  | 'questionnaire_in_progress' 
  | 'questionnaire_completed' 
  | 'under_review_hr' 
  | 'rejected_auto' 
  | 'accepted' 
  | 'rejected_hr'
  | 'review_needed_scoring_failed';

export interface JobApplication {
  id: string; 
  candidateId: string; 
  candidateNameSnapshot?: string; 
  candidateEmailSnapshot?: string; 
  candidateResumeTextSnapshot?: string; 
  jobId: string;
  jobTitle: string;
  jobDescription: string; 
  status: JobApplicationStatus;
  questions?: AIQuestion[]; 
  answers?: { questionId: string; answerText: string }[];
  score?: number;
  scoreJustification?: string;
  feedbackToCandidate?: string; 
  rejectionReason?: string; 
  appliedAt: Date | Timestamp;
  questionnaireGeneratedAt?: Date | Timestamp;
  questionnaireCompletedAt?: Date | Timestamp;
  reviewedByHrAt?: Date | Timestamp;
}
