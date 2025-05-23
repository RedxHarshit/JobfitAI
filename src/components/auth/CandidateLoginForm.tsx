
// src/components/auth/CandidateLoginForm.tsx
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type EmailLoginFormValues } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const candidateLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type CandidateLoginFormValues = z.infer<typeof candidateLoginSchema>;

export function CandidateLoginForm() {
  const { signIn, error: authError, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CandidateLoginFormValues>({
    resolver: zodResolver(candidateLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleEmailSubmit: SubmitHandler<CandidateLoginFormValues> = async (data) => {
    const user = await signIn(data);
    if (user) {
      toast({
        title: "Login Successful!",
        description: "Welcome back to the Candidate Portal.",
      });
      router.push("/candidate/dashboard"); // Redirect to candidate dashboard
    }
    // authError will be displayed by the Alert component if login fails
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Candidate Portal Login
          </CardTitle>
          <CardDescription>
            Access your applications and profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email-candidate-auth">Email</Label>
              <Input id="email-candidate-auth" type="email" placeholder="you@example.com" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-candidate-auth">Password</Label>
              <Input id="password-candidate-auth" type="password" placeholder="••••••••" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader size={20} className="mr-2" /> : <LogIn className="mr-2 h-5 w-5" />}
              {loading ? "Signing In..." : "Sign In"}
            </Button>
            {/* Add link to candidate sign-up if needed later */}
            {/* <div className="text-center">
              <Button variant="link" onClick={() => router.push('/candidate/signup')} className="text-sm" type="button">
                Don't have an account? Sign Up
              </Button>
            </div> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
