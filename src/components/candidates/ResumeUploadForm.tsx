// src/components/candidates/ResumeUploadForm.tsx
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, FileText, Sparkles } from "lucide-react";
import { parseResume, type ParseResumeOutput } from "@/ai/flows/parse-resume";
import { fileToDataUri } from "@/utils/fileUtils";
import { useAppContext } from "@/contexts/AppContext";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/types";
import { cn } from "@/lib/utils";


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

const resumeUploadSchema = z.object({
  resume: z
    .custom<FileList>((val) => val instanceof FileList && val.length > 0, "Resume file is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ALLOWED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .pdf, .docx, and .txt files are allowed."
    ),
});

type ResumeUploadFormValues = z.infer<typeof resumeUploadSchema>;

export function ResumeUploadForm() {
  const { toast } = useToast();
  const { addCandidate } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<ResumeUploadFormValues>({
    resolver: zodResolver(resumeUploadSchema),
  });

  const resumeFile = watch("resume");
  if (resumeFile && resumeFile.length > 0 && resumeFile[0].name !== fileName) {
    setFileName(resumeFile[0].name);
  }


  const onSubmit: SubmitHandler<ResumeUploadFormValues> = async (data) => {
    setLoading(true);
    setError(null);

    if (!data.resume || data.resume.length === 0) {
      setError("No file selected.");
      setLoading(false);
      return;
    }

    const file = data.resume[0];

    try {
      const dataUri = await fileToDataUri(file);
      const parsedData: ParseResumeOutput = await parseResume({ resumeDataUri: dataUri });
      
      // Prepare candidate data without ID, as AppContext will handle it with Firestore
      const candidateToCreate: Omit<Candidate, "id" | "userId"> = {
        resumeFileName: file.name,
        parsedText: '', 
        ...parsedData,
      };
      
      const newCandidate = await addCandidate(candidateToCreate);

      if (newCandidate) {
        toast({
          title: "Resume Parsed Successfully!",
          description: `${newCandidate.candidateName}'s resume has been processed.`,
          variant: "default",
        });
        router.push(`/dashboard/candidates/${newCandidate.id}`);
        reset(); 
        setFileName(null);
      } else {
        throw new Error("Failed to save candidate after parsing.");
      }

    } catch (err: any) {
      console.error("Error parsing resume:", err);
      const errorMessage = err.message || "Failed to parse resume. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error Parsing Resume",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <UploadCloud className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">Upload Candidate Resume</CardTitle>
        </div>
        <CardDescription>
          Let AI extract key information and kickstart your evaluation process. 
          Supports PDF, DOCX, and TXT files (max 5MB).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume" className="text-base">Resume File</Label>
            <div className="flex items-center justify-center w-full">
                <label 
                    htmlFor="resume-input" 
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer",
                        "bg-muted/50 hover:bg-muted/75 border-border hover:border-primary",
                        errors.resume && "border-destructive hover:border-destructive"
                    )}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className={cn("w-10 h-10 mb-3", errors.resume ? "text-destructive" : "text-primary")} />
                        {fileName ? (
                          <>
                            <p className="mb-2 text-sm text-foreground"><span className="font-semibold">{fileName}</span></p>
                            <p className="text-xs text-muted-foreground">Click to change file</p>
                          </>
                        ) : (
                          <>
                            <p className="mb-2 text-sm text-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT (MAX. 5MB)</p>
                          </>
                        )}
                    </div>
                    <Input id="resume-input" type="file" className="hidden" {...register("resume")} />
                </label>
            </div>
            {errors.resume && <p className="text-sm text-destructive pt-1">{errors.resume.message}</p>}
          </div>
          
          <Button type="submit" className="w-full text-lg py-6" disabled={loading}>
            {loading ? (
              <Loader size={24} className="mr-2" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {loading ? "Parsing Resume..." : "Parse with AI"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Your data is processed securely. Ensure the resume does not contain overly sensitive personal information not relevant for recruitment.
        </p>
      </CardFooter>
    </Card>
  );
}
