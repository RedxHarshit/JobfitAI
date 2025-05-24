
// src/types/index.ts
import type { ParseResumeOutput } from "@/ai/flows/parse-resume";
import type { MatchCandidateToJobOutput } from "@/ai/flows/match-candidate-to-job";
import type { Timestamp } from "firebase/firestore";

export interface InterviewQuestionCategory {
  category: string;
  questions: string[];
}

export interface Candidate extends ParseResumeOutput {
  id: string; // For HR-added candidates, this is Firestore's auto-ID. For candidates managing their own, this is their auth.uid.
  userId: string; // For HR-added, this is HR's auth.uid. For candidate-managed, this is candidate's auth.uid.
  resumeFileName?: string;
  parsedText?: string; // Full text of the resume for AI processing
  matchData?: MatchCandidateToJobOutput & { jobId: string | null };
  interviewQuestions?: InterviewQuestionCategory[];
  profileLastUpdatedAt?: Date;
}

export interface Job {
  id:string;
  userId: string; // HR User UID who created the job
  title: string;
  description: string;
  createdAt: Date;
}

export interface AIQuestion {
  id: string; // Unique ID for the question
  text: string;
  // type: 'text' | 'multiple-choice' | 'rating'; // For future expansion
  // options?: string[]; // For multiple-choice
}

export interface JobApplication {
  id: string; // Firestore document ID
  candidateId: string; // Candidate's auth UID
  candidateNameSnapshot?: string; // Candidate's name at time of application
  candidateEmailSnapshot?: string; // Candidate's email at time of application
  candidateResumeTextSnapshot?: string; // Snapshot of resume text
  jobId: string;
  jobTitle: string;
  jobDescription: string; // Snapshot of job description
  status: 'questionnaire_pending' | 'questionnaire_in_progress' | 'questionnaire_completed' | 'under_review' | 'rejected' | 'hired';
  questions?: AIQuestion[]; // Generated AI questions
  answers?: { questionId: string; answerText: string }[];
  score?: number;
  feedbackToCandidate?: string; // General feedback message for the candidate
  rejectionReason?: string; // If rejected by HR or automatically
  appliedAt: Date | Timestamp;
  questionnaireGeneratedAt?: Date | Timestamp;
  questionnaireCompletedAt?: Date | Timestamp;
  reviewedByHrAt?: Date | Timestamp;
}
