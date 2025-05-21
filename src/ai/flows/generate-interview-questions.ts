// src/ai/flows/generate-interview-questions.ts
'use server';
/**
 * @fileOverview AI agent for generating tailored interview questions.
 *
 * - generateInterviewQuestions - A function that generates interview questions based on a candidate's profile and job requirements.
 * - GenerateInterviewQuestionsInput - The input type for the generateInterviewQuestions function.
 * - GenerateInterviewQuestionsOutput - The return type for the generateInterviewQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  candidateProfile: z
    .string()
    .describe('The profile of the candidate, including skills and experience.'),
  jobRequirements: z
    .string()
    .describe('The requirements for the job, including skills and experience.'),
});
export type GenerateInterviewQuestionsInput = z.infer<
  typeof GenerateInterviewQuestionsInputSchema
>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  interviewQuestions: z
    .string()
    .describe('A list of interview questions tailored to the candidate and job.'),
});
export type GenerateInterviewQuestionsOutput = z.infer<
  typeof GenerateInterviewQuestionsOutputSchema
>;

export async function generateInterviewQuestions(
  input: GenerateInterviewQuestionsInput
): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const generateInterviewQuestionsPrompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an expert recruiter. Generate a list of interview questions tailored to the candidate's profile and the job requirements.

Candidate Profile: {{{candidateProfile}}}
Job Requirements: {{{jobRequirements}}}

Interview Questions:`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateInterviewQuestionsPrompt(input);
    return output!;
  }
);
