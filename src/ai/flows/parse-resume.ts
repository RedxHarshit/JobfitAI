
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
  parsedText: z.string().describe("The full text content extracted from the resume, as a single string."),
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

  Specifically, extract:
  - The candidate's full name.
  - The candidate's email address (if available).
  - The candidate's phone number (if available).
  - A list of relevant skills.
  - A list of key experiences.
  - A list of education details.
  - The full text content of the resume as a single string.

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
    const response = await prompt(input);
    // Genkit v1.x structure for prompt response
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors.map(e => e.message || String(e)).join(', ');
      console.error('Error from parseResumePrompt:', errorMessages, response.errors);
      throw new Error(`AI prompt failed for resume parsing: ${errorMessages}`);
    }

    if (!response.output) {
      console.error('ParseResumePrompt returned no output. Full response:', response);
      throw new Error('The AI model did not return the expected output for resume parsing.');
    }
    if (!response.output.parsedText) {
      console.warn('ParseResumePrompt output did not contain parsedText. Using empty string as fallback.');
      response.output.parsedText = ""; // Ensure parsedText is at least an empty string
    }
    
    return response.output;
  }
);

