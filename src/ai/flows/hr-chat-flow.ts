
'use server';
/**
 * @fileOverview HR-specific AI chatbot flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// Tools are temporarily removed for this diagnostic version
// import { getJobDetailsTool } from '@/ai/tools/get-job-details-tool';
// import { getAllCandidatesTool } from '@/ai/tools/get-all-candidates-tool';
// import { screenResumeTool } from '@/ai/tools/screen-resume-tool';
// import { matchCandidateToJob } from './match-candidate-to-job';

const HrChatInputSchema = z.object({
  userMessage: z.string(),
});
export type HrChatInput = z.infer<typeof HrChatInputSchema>;

// Simplified output schema for the AI's direct response
const HrChatPromptOutputSchema = z.object({
  botResponse: z.string().describe("The AI's textual response."),
});

// Output schema for the overall HR chat flow (what the client receives)
const SimpleChatOutputSchema = z.object({
  botResponse: z.string(),
});
export type SimpleChatOutput = z.infer<typeof SimpleChatOutputSchema>;

// DRASTICALLY SIMPLIFIED PROMPT FOR DIAGNOSIS
const hrChatPrompt = ai.definePrompt(
  {
    name: 'hrChatPromptSimplified', // Changed name to avoid cache issues
    input: { schema: HrChatInputSchema },
    output: { schema: HrChatPromptOutputSchema },
    // tools: [], // Tools temporarily removed
    system: `You are "JobFit AI HR Assistant". Respond directly and concisely to the user's message.`,
    prompt: `{{{userMessage}}}`, // Simplest possible prompt template
  }
);

export async function hrChatFlow(input: HrChatInput): Promise<SimpleChatOutput> {
  return hrChatFlowInternal(input);
}

const hrChatFlowInternal = ai.defineFlow(
  {
    name: 'hrChatFlowInternal',
    inputSchema: HrChatInputSchema,
    outputSchema: SimpleChatOutputSchema,
  },
  async (input): Promise<SimpleChatOutput> => {
    const DEBUG_IN_CHAT = true;
    let debugInfoForChat = '';

    console.log('[hrChatFlowInternal] DIAGNOSTIC RUN - Called with input:', input.userMessage);
    debugInfoForChat += `\n\n--- DEBUG LOG START (DIAGNOSTIC RUN) ---\n[hrChatFlowInternal] Called with input: ${input.userMessage}\n`;

    const trimmedUserMessage = input.userMessage.trim();
    if (!trimmedUserMessage) {
      return { botResponse: "Please provide a message." };
    }
    
    const inputToPrompt = { userMessage: trimmedUserMessage };
    debugInfoForChat += `[hrChatFlowInternal] Input to hrChatPromptSimplified: ${JSON.stringify(inputToPrompt, null, 2)}\n`;

    try {
      const promptResult = await hrChatPrompt(inputToPrompt); // Direct functional call

      debugInfoForChat += `[hrChatFlowInternal] Raw aiResponseOutput from hrChatPromptSimplified: ${JSON.stringify(promptResult.output, null, 2)}\n`;
      debugInfoForChat += `[hrChatFlowInternal] Prompt Errors: ${JSON.stringify(promptResult.errors, null, 2)}\n`;
      debugInfoForChat += `[hrChatFlowInternal] History: ${JSON.stringify(promptResult.history, null, 2)}\n`;


      if (promptResult.output && promptResult.output.botResponse) {
        debugInfoForChat += `[hrChatFlowInternal DEBUG] FINAL botResponse: "${promptResult.output.botResponse}"\n`;
        return { botResponse: promptResult.output.botResponse + (DEBUG_IN_CHAT ? debugInfoForChat + "--- DEBUG LOG END ---\n" : "") };
      } else {
        const errorMessage = "AI did not provide a valid botResponse.";
        console.error('[hrChatFlowInternal] DIAGNOSTIC RUN - AI did not provide a valid botResponse. Output:', promptResult.output);
        debugInfoForChat += `[hrChatFlowInternal DEBUG] ${errorMessage}\n`;
        return { botResponse: "I'm having trouble processing this. " + (DEBUG_IN_CHAT ? debugInfoForChat + "--- DEBUG LOG END ---\n" : "") };
      }

    } catch (e: any) {
      console.error('[hrChatFlowInternal] DIAGNOSTIC RUN - Error THROWN by hrChatPromptSimplified call. Message:', e.message);
      let errorDetailsString = 'Could not stringify error details.';
      try {
        errorDetailsString = JSON.stringify({
          name: e.name,
          message: e.message,
          status: e.status,
          details: e.details,
          // Do NOT include the full 'e' object here, as it might be circular or too large for chat.
          // Especially avoid including the large schema objects from the error message in the client response.
        }, (key, value) => (key === 'schema' || key === 'providedData' || key === 'requiredJsonSchema') ? '[schema omitted]' : value, 2);
      } catch (stringifyError) {
        // Fallback if even selective stringify fails
      }
      debugInfoForChat += `[hrChatFlowInternal] Error THROWN by hrChatPromptSimplified. Debug: hrChatPromptSimplified failed. Error: ${e.message}\nFull Error Object (selective): ${errorDetailsString}\n`;
      const fallbackMessage = "I had a little trouble formulating that response. Could you try asking in a different way?";
      return { botResponse: fallbackMessage + (DEBUG_IN_CHAT ? debugInfoForChat + "--- DEBUG LOG END ---\n" : "") };
    }
  }
);

    