// Use server directive is required when using Genkit flows in react server components.
'use server';

/**
 * @fileOverview An AI agent that parses resumes to extract key skills and experience.
 *
 * - parseResume - A function that handles the resume parsing process.
 * - ParseResumeInput - The input type for the parseResume function.
 * - ParseResumeOutput - The return type for the parseResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseResumeInput = z.infer<typeof ParseResumeInputSchema>;

const ParseResumeOutputSchema = z.object({
  candidateName: z.string().describe("The candidate's full name."),
  email: z.string().describe("The candidate's email address.").optional(),
  phone: z.string().describe("The candidate's phone number.").optional(),
  skills: z.array(z.string()).describe('A list of relevant skills extracted from the resume.'),
  experience: z.array(z.string()).describe('A list of key experiences extracted from the resume.'),
  education: z.array(z.string()).describe('A list of education details extracted from the resume.'),
});
export type ParseResumeOutput = z.infer<typeof ParseResumeOutputSchema>;

export async function parseResume(input: ParseResumeInput): Promise<ParseResumeOutput> {
  return parseResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseResumePrompt',
  input: {schema: ParseResumeInputSchema},
  output: {schema: ParseResumeOutputSchema},
  prompt: `You are an expert resume parser. Your job is to extract key information from resumes.

  Specifically, extract the candidate's name, email, phone number, a list of skills, a list of key experiences, and a list of education details.

  Here is the resume data:
  {{media url=resumeDataUri}}`,
});

const parseResumeFlow = ai.defineFlow(
  {
    name: 'parseResumeFlow',
    inputSchema: ParseResumeInputSchema,
    outputSchema: ParseResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

