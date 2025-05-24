import { config } from 'dotenv';
config();

import '@/ai/flows/match-candidate-to-job.ts';
import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/parse-resume.ts';
import '@/ai/flows/generate-questionnaire.ts';
