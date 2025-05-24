// src/ai/flows/generate-questionnaire.ts
'use server';
/**
 * @fileOverview AI agent for generating tailored questionnaire questions for a job application.
 *
 * - generateQuestionnaireForApplication - Generates questions based on candidate resume and job description.
 * - GenerateQuestionnaireInput - Input type.
 * - GenerateQuestionnaireOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionnaireInputSchema = z.object({
  candidateResumeText: z
    .string()
    .describe("The full text content of the candidate's resume."),
  jobDescription: z
    .string()
    .describe('The full text of the job description the candidate is applying for.'),
});
export type GenerateQuestionnaireInput = z.infer<
  typeof GenerateQuestionnaireInputSchema
>;

const GenerateQuestionnaireOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of 5-7 open-ended interview questions tailored to the candidate and job. These should probe skills, experience, and situational judgment relevant to the role described in the job description and the candidate profile from the resume. Avoid simple yes/no questions.'),
});
export type GenerateQuestionnaireOutput = z.infer<
  typeof GenerateQuestionnaireOutputSchema
>;

export async function generateQuestionnaireForApplication(
  input: GenerateQuestionnaireInput
): Promise<GenerateQuestionnaireOutput> {
  return generateQuestionnaireFlow(input);
}

const generateQuestionnairePrompt = ai.definePrompt({
  name: 'generateQuestionnairePrompt',
  input: {schema: GenerateQuestionnaireInputSchema},
  output: {schema: GenerateQuestionnaireOutputSchema},
  prompt: `You are an expert hiring manager. Based on the provided candidate resume and job description, generate a list of 5-7 insightful, open-ended interview questions.
The questions should help assess the candidate's suitability for the role, focusing on skills, experience, problem-solving abilities, and cultural fit where appropriate.
Avoid simple factual recall questions or yes/no questions. Aim for questions that encourage detailed responses.

Candidate Resume Text:
{{{candidateResumeText}}}

Job Description:
{{{jobDescription}}}
`,
});

const generateQuestionnaireFlow = ai.defineFlow(
  {
    name: 'generateQuestionnaireFlow',
    inputSchema: GenerateQuestionnaireInputSchema,
    outputSchema: GenerateQuestionnaireOutputSchema,
  },
  async input => {
    const {output, errors} = await generateQuestionnairePrompt(input);
    if (errors && errors.length > 0) {
      const errorMessages = errors.map(e => e.message || String(e)).join(', ');
      console.error('Error from generateQuestionnairePrompt:', errorMessages, errors);
      throw new Error(`AI prompt for questionnaire generation failed: ${errorMessages}`);
    }
    if (!output || !output.questions || output.questions.length === 0) {
        console.error('generateQuestionnairePrompt returned no questions or invalid format. Full response:', {output, errors});
        throw new Error('The AI model did not return the expected list of questions.');
    }
    return output;
  }
);
