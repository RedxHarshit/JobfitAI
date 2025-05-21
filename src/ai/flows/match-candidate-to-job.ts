// src/ai/flows/match-candidate-to-job.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for matching candidates to job descriptions.
 *
 * matchCandidateToJob - A function that takes a candidate's resume and a job description, and returns a match score and explanation.
 * MatchCandidateToJobInput - The input type for the matchCandidateToJob function.
 * MatchCandidateToJobOutput - The return type for the matchCandidateToJob function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchCandidateToJobInputSchema = z.object({
  resumeText: z
    .string()
    .describe("The candidate's resume text."),
  jobDescription: z.string().describe('The job description text.'),
});
export type MatchCandidateToJobInput = z.infer<typeof MatchCandidateToJobInputSchema>;

const MatchCandidateToJobOutputSchema = z.object({
  matchScore: z.number().describe('A score between 0 and 1 indicating how well the candidate matches the job description.'),
  explanation: z.string().describe('An explanation of why the candidate was given the match score.'),
});
export type MatchCandidateToJobOutput = z.infer<typeof MatchCandidateToJobOutputSchema>;

export async function matchCandidateToJob(input: MatchCandidateToJobInput): Promise<MatchCandidateToJobOutput> {
  return matchCandidateToJobFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchCandidateToJobPrompt',
  input: {schema: MatchCandidateToJobInputSchema},
  output: {schema: MatchCandidateToJobOutputSchema},
  prompt: `You are an expert recruiter. Given a candidate's resume and a job description, determine how well the candidate matches the job description.

  Provide a match score between 0 and 1, where 0 means the candidate is not a good fit and 1 means the candidate is a perfect fit.
  Also provide a short explanation of why the candidate was given the match score.

  Resume:
  {{resumeText}}

  Job Description:
  {{jobDescription}}`,
});

const matchCandidateToJobFlow = ai.defineFlow(
  {
    name: 'matchCandidateToJobFlow',
    inputSchema: MatchCandidateToJobInputSchema,
    outputSchema: MatchCandidateToJobOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
