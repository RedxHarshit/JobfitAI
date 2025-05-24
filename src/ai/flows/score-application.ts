// src/ai/flows/score-application.ts
'use server';
/**
 * @fileOverview AI agent for scoring a candidate's application based on resume, job description, and questionnaire answers.
 *
 * - scoreApplication - Scores the application.
 * - ScoreApplicationInput - Input type.
 * - ScoreApplicationOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScoreApplicationInputSchema = z.object({
  candidateResumeText: z
    .string()
    .min(1, {message: "Candidate resume text cannot be empty."})
    .describe("The full text content of the candidate's resume."),
  jobDescription: z
    .string()
    .min(1, {message: "Job description cannot be empty."})
    .describe('The full text of the job description.'),
  questionnaireAnswers: z
    .array(
      z.object({
        questionText: z.string().describe('The text of the interview question.'),
        answerText: z.string().describe("The candidate's answer to the question."),
      })
    )
    .describe("A list of questions and the candidate's answers."),
});
export type ScoreApplicationInput = z.infer<typeof ScoreApplicationInputSchema>;

const ScoreApplicationOutputSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'A numerical score from 0 to 100 indicating the overall match and suitability of the candidate, based on resume, job description, and questionnaire answers. Higher scores mean better fit.'
    ),
  justification: z
    .string()
    .describe(
      'A detailed explanation for the given score, highlighting strengths, weaknesses, and key factors considered from the resume, job description, and answers.'
    ),
});
export type ScoreApplicationOutput = z.infer<typeof ScoreApplicationOutputSchema>;

export async function scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationOutput> {
  console.log("[scoreApplicationFlow] Called with input:", {
    resumeLength: input.candidateResumeText.length,
    jobDescLength: input.jobDescription.length,
    numAnswers: input.questionnaireAnswers.length
  });
  return scoreApplicationFlow(input);
}

const scoreApplicationPrompt = ai.definePrompt({
  name: 'scoreApplicationPrompt',
  input: {schema: ScoreApplicationInputSchema},
  output: {schema: ScoreApplicationOutputSchema},
  prompt: `You are an expert hiring manager and talent evaluator. Your task is to score a candidate's application for a specific job.
You will be provided with:
1. The candidate's resume text.
2. The job description.
3. The candidate's answers to a set of interview questions.

Carefully analyze all three components to assess the candidate's overall suitability for the role.
Provide a numerical score between 0 and 100, where 100 is a perfect match.
Also, provide a detailed justification for your score, explaining your reasoning by referencing specific aspects of the resume, job description, and answers.

Candidate Resume Text:
{{{candidateResumeText}}}

Job Description:
{{{jobDescription}}}

Questionnaire Answers:
{{#each questionnaireAnswers}}
Question: {{{this.questionText}}}
Answer: {{{this.answerText}}}
---
{{/each}}
`,
});

const scoreApplicationFlow = ai.defineFlow(
  {
    name: 'scoreApplicationFlow',
    inputSchema: ScoreApplicationInputSchema,
    outputSchema: ScoreApplicationOutputSchema,
  },
  async input => {
    console.log("[scoreApplicationFlow] Executing flow...");
    const {output, errors} = await scoreApplicationPrompt(input);

    if (errors && errors.length > 0) {
      const errorMessages = errors.map(e => e.message || String(e)).join(', ');
      console.error('[scoreApplicationFlow] Error from scoreApplicationPrompt:', errorMessages, errors);
      throw new Error(`AI prompt for application scoring failed: ${errorMessages}`);
    }
    if (!output || typeof output.score !== 'number' || typeof output.justification !== 'string') {
        console.error('[scoreApplicationFlow] scoreApplicationPrompt returned invalid output. Full response:', {output, errors});
        throw new Error('The AI model did not return the expected structured output (score and justification) for application scoring.');
    }
    console.log("[scoreApplicationFlow] Successfully scored application. Score:", output.score);
    return output;
  }
);
