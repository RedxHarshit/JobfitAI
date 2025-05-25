// src/components/auth/CandidateSignUpForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserPlus, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

const candidateSignUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type CandidateSignUpFormValues = z.infer<typeof candidateSignUpSchema>;

export function CandidateSignUpForm() {
  const { candidateSignUp, error: authError, loading, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);


  const form = useForm<CandidateSignUpFormValues>({
    resolver: zodResolver(candidateSignUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // If user object becomes available AND their email is not yet verified AND we are in the 'isSignedUp' state,
    // it implies they just signed up. We keep them on this page to see the "verify email" message.
    // If they navigate away and come back, or if their email IS verified, this effect won't redirect.
    if (user && user.emailVerified && isSignedUp) {
      toast({
        title: "Email Verified!",
        description: "You can now log in.",
      });
      router.replace("/candidate/login");
    }
  }, [user, isSignedUp, router, toast]);


  const handleSubmitSignUp: SubmitHandler<CandidateSignUpFormValues> = async (data) => {
    const newUser = await candidateSignUp(data);
    if (newUser) {
      setIsSignedUp(true); // Set this flag to show the "check your email" message
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account. You will be redirected to login once verified.",
        duration: 10000, // Longer duration for this important message
      });
      // Don't redirect immediately, let them see the message.
      // The useEffect hook will handle redirect after verification or if they try to login.
    }
    // authError will be displayed by the Alert component if signup fails
  };

  if (isSignedUp && user && !user.emailVerified) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Check Your Email!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">We've sent a verification link to <strong>{user.email}</strong>.</p>
            <p className="mb-6">Please click the link in the email to complete your sign-up. After verifying, you can log in.</p>
            <p className="text-sm text-muted-foreground">If you don't see the email, please check your spam folder.</p>
            <Button onClick={() => router.push('/candidate/login')} variant="outline" className="mt-6">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            JobFit AI Candidate Sign Up
          </CardTitle>
          <CardDescription>
            Create your JobFit AI candidate account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Sign Up Error</AlertTitle>
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(handleSubmitSignUp)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email-candidate-signup">Email</Label>
              <Input id="email-candidate-signup" type="email" placeholder="you@example.com" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="password-candidate-signup">Password</Label>
              <Input
                id="password-candidate-signup"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...form.register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-7 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="confirmPassword-candidate-signup">Confirm Password</Label>
              <Input
                id="confirmPassword-candidate-signup"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...form.register("confirmPassword")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-7 h-7 w-7"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
              {form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader size={20} className="mr-2" /> : <UserPlus className="mr-2 h-5 w-5" />}
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm">
            Already have an account?{" "}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/candidate/login">Sign In</Link>
            </Button>
          </p>
           <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-4">
             <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
