// src/components/jobs/JobForm.tsx
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/loader";
import { Briefcase, Save } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useRouter } from "next/navigation";
import type { Job } from "@/types";

const jobSchema = z.object({
  title: z.string().min(3, { message: "Job title must be at least 3 characters" }).max(100, { message: "Job title must be 100 characters or less" }),
  description: z.string().min(50, { message: "Job description must be at least 50 characters" }).max(5000, { message: "Job description must be 5000 characters or less" }),
});

type JobFormValues = z.infer<typeof jobSchema>;

export function JobForm() {
  const { toast } = useToast();
  const { addJob } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
  });

  const onSubmit: SubmitHandler<JobFormValues> = async (data) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const newJob: Job = {
        id: crypto.randomUUID(), // Simple unique ID
        ...data,
        createdAt: new Date(),
      };
      addJob(newJob);

      toast({
        title: "Job Created Successfully!",
        description: `The job "${data.title}" has been posted.`,
      });
      reset();
      router.push("/dashboard/jobs"); 
    } catch (err) {
      toast({
        title: "Error Creating Job",
        description: "Something went wrong. Please try again.",
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
          <Briefcase className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">Create New Job Posting</CardTitle>
        </div>
        <CardDescription>
          Fill in the details below to create a new job listing. This will be used for matching candidates.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base">Job Title</Label>
            <Input id="title" placeholder="e.g., Senior Software Engineer" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">Job Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the role, responsibilities, qualifications, etc."
              {...register("description")}
              rows={10}
              className="min-h-[200px]"
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full text-lg py-6" disabled={loading}>
            {loading ? (
              <Loader size={24} className="mr-2" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {loading ? "Saving Job..." : "Save Job Posting"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
