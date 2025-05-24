
// src/components/candidates/ResumeUploadForm.tsx
"use client";

import { useState, useEffect } from "react";
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
import { UploadCloud, Sparkles, UserSquare2 } from "lucide-react";
import { parseResume, type ParseResumeOutput } from "@/ai/flows/parse-resume";
import { fileToDataUri } from "@/utils/fileUtils";
import { useAppContext } from "@/contexts/AppContext";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";


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

interface ResumeUploadFormProps {
  isCandidateMode?: boolean;
  candidateUserId?: string;
  candidateAuthDisplayName?: string;
  candidateAuthEmail?: string;
}

export function ResumeUploadForm({ 
  isCandidateMode = false, 
  candidateUserId,
  candidateAuthDisplayName,
  candidateAuthEmail
}: ResumeUploadFormProps) {
  const { toast } = useToast();
  const { addCandidate, saveCandidateDataForUser } = useAppContext();
  const { user: hrUser } = useAuth(); // For HR mode
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<ResumeUploadFormValues>({
    resolver: zodResolver(resumeUploadSchema),
  });

  const watchedFiles = watch("resume");
  useEffect(() => {
    if (watchedFiles && watchedFiles.length > 0) {
      setFileName(watchedFiles[0].name);
    } else {
      setFileName(null);
    }
  }, [watchedFiles]);


  const onSubmit: SubmitHandler<ResumeUploadFormValues> = async (data) => {
    setError(null);
    setLoading(true);

    const currentUserIdForAction = isCandidateMode ? candidateUserId : hrUser?.uid;
    if (!currentUserIdForAction) {
      const authErrorMsg = "User not authenticated. Please log in.";
      setError(authErrorMsg);
      toast({
        title: "Authentication Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!data.resume || data.resume.length === 0) {
      setError("No file selected.");
      setLoading(false);
      return;
    }
    const file = data.resume[0];

    try {
      const dataUri = await fileToDataUri(file);
      const parsedData: ParseResumeOutput = await parseResume({ resumeDataUri: dataUri });
      
      if (isCandidateMode && candidateUserId) { // Candidate mode
        if(candidateUserId !== currentUserIdForAction) {
          throw new Error("User ID mismatch in candidate mode.");
        }
        const candidateProfileData = {
          candidateName: parsedData.candidateName || candidateAuthDisplayName || "N/A",
          email: parsedData.email || candidateAuthEmail,
          phone: parsedData.phone,
          skills: parsedData.skills || [],
          experience: parsedData.experience || [],
          education: parsedData.education || [],
          resumeFileName: file.name,
          parsedText: parsedData.parsedText || '', 
          profileLastUpdatedAt: new Date(),
          userId: candidateUserId,
        };

        const updatedCandidate = await saveCandidateDataForUser(candidateUserId, candidateProfileData);
        if (updatedCandidate) {
          toast({
            title: "Resume Updated Successfully!",
            description: `Your profile has been updated with the new resume.`,
          });
          router.push(`/candidate/dashboard`); 
        } else {
          throw new Error("Failed to update your candidate profile.");
        }

      } else { // HR Mode
        const candidateToCreate: Omit<Candidate, "id" | "userId"> = {
          resumeFileName: file.name,
          parsedText: parsedData.parsedText || '', 
          ...parsedData,
          // userId will be hrUser.uid, set by addCandidate
        };
        
        const newCandidate = await addCandidate(candidateToCreate);
        if (newCandidate) {
          toast({
            title: "Resume Parsed Successfully!",
            description: `${newCandidate.candidateName || 'Candidate'}'s resume has been processed.`,
          });
          router.push(`/dashboard/candidates/${newCandidate.id}`);
        } else {
          throw new Error("Failed to save candidate after parsing.");
        }
      }
      reset(); 
      setFileName(null);
    } catch (err: any) {
      console.error("Detailed error in ResumeUploadForm onSubmit:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : "An unknown error occurred during resume processing or saving.");
      setError(errorMessage);
      toast({
        title: isCandidateMode ? "Resume Update Failed" : "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const title = isCandidateMode ? "Upload/Update Your Resume" : "Upload Candidate Resume";
  const description = isCandidateMode 
    ? "Upload your latest resume. Our AI will parse it to keep your profile up-to-date for job matching."
    : "Let AI extract key information and kickstart your evaluation process. Supports PDF, DOCX, and TXT files (max 5MB).";
  const buttonIcon = isCandidateMode ? <UserSquare2 className="mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />;
  const buttonText = isCandidateMode ? "Upload and Update Profile" : "Parse with AI";

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <UploadCloud className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{isCandidateMode ? "Update Failed" : "Upload Failed"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume-upload-input" className="text-base">Resume File</Label>
            <div className="flex items-center justify-center w-full">
                <label 
                    htmlFor="resume-upload-input" 
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
                    <Input id="resume-upload-input" type="file" className="hidden" {...register("resume")} />
                </label>
            </div>
            {errors.resume && <p className="text-sm text-destructive pt-1">{errors.resume.message}</p>}
          </div>
          
          <Button type="submit" className="w-full text-lg py-6" disabled={loading || !watchedFiles || watchedFiles.length === 0}>
            {loading ? <Loader size={24} className="mr-2" /> : buttonIcon}
            {loading ? (isCandidateMode ? "Processing Resume..." : "Parsing Resume...") : buttonText}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Your data is processed securely. Ensure the resume does not contain overly sensitive personal information not relevant for job applications.
        </p>
      </CardFooter>
    </Card>
  );
}

