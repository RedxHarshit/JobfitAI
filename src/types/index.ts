
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
  | 'under_review_hr' // Could be set if any application is under review by HR
  | 'contacted' 
  | 'interview_scheduled' // Set if any application moves to this state
  | 'offer_extended' 
  | 'hired' 
  | 'rejected_overall'; // General rejection not tied to a specific app

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
  | 'accepted' // HR accepted, perhaps leading to an interview
  | 'interview_scheduled' // Interview specifically scheduled
  | 'rejected_hr' // HR rejected after review
  | 'review_needed_scoring_failed';

export interface InterviewDetails {
  date: string; // Store as ISO string or YYYY-MM-DD
  time: string; // e.g., "10:00 AM PST"
  notes?: string;
}

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
  interviewDetails?: InterviewDetails;
}

