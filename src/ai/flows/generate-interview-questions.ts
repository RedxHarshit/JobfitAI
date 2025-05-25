
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

const InterviewQuestionCategorySchema = z.object({
  category: z.string().describe("The category name for a group of interview questions (e.g., 'Behavioral', 'Technical Skills')."),
  questions: z.array(z.string()).describe("A list of interview questions within this category."),
});

const GenerateInterviewQuestionsOutputSchema = z.object({
  structuredQuestions: z.array(InterviewQuestionCategorySchema)
    .describe('An array of interview question categories. Each category object should have a "category" (string) and "questions" (array of strings) field. For example: [{"category": "Behavioral", "questions": ["Tell me about yourself.", "Describe a challenge you faced."]}]'),
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
Organize the questions into logical categories (e.g., Behavioral, Technical, Scenario-based).
Return the output as a JSON array of objects, where each object has a "category" key (string) and a "questions" key (array of strings).

Candidate Profile:
{{{candidateProfile}}}

Job Requirements:
{{{jobRequirements}}}
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output, errors} = await generateInterviewQuestionsPrompt(input);
    if (errors && errors.length > 0) {
      const errorMessages = errors.map(e => e.message || String(e)).join(', ');
      console.error('Error from generateInterviewQuestionsPrompt:', errorMessages, errors);
      throw new Error(`AI prompt for interview questions failed: ${errorMessages}`);
    }
    if (!output || !output.structuredQuestions) {
        console.error('generateInterviewQuestionsPrompt returned no structuredQuestions. Full response:', {output, errors});
        throw new Error('The AI model did not return the expected structured output for interview questions.');
    }
    return output;
  }
);

    