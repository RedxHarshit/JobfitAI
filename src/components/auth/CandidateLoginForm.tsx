// src/components/auth/CandidateLoginForm.tsx
"use client";

import { useState } from "react";
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
import { LogIn, Eye, EyeOff, UserPlus, MailWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const candidateLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export type CandidateLoginFormValues = z.infer<typeof candidateLoginSchema>;

export function CandidateLoginForm() {
  const { candidateSignIn, sendPasswordReset, error: authError, loading, user, sendVerificationEmail } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState<string | null>(null);


  const form = useForm<CandidateLoginFormValues>({
    resolver: zodResolver(candidateLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleEmailSubmit: SubmitHandler<CandidateLoginFormValues> = async (data) => {
    setEmailVerificationMessage(null); // Clear previous messages
    const signedInUser = await candidateSignIn(data);

    if (signedInUser) {
      if (!signedInUser.emailVerified) {
        setEmailVerificationMessage(`Your email ${signedInUser.email} is not verified. Please check your inbox for a verification link.`);
        // Optionally, offer to resend verification email
        toast({
          title: "Email Not Verified",
          description: `A verification link was sent to ${signedInUser.email}. Please verify to continue.`,
          variant: "default",
          duration: 10000,
        });
        return; // Stop further processing
      }
      toast({
        title: "Login Successful!",
        description: "Welcome back to the Candidate Portal.",
      });
      router.push("/candidate/dashboard");
    }
    // authError will be displayed by the Alert component if login fails generally
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email");
    if (!email || form.formState.errors.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }
    const success = await sendPasswordReset(email);
    if (success) {
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password.",
      });
    } else {
       toast({
        title: "Error Sending Reset Email",
        description: authError?.message || "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResendVerification = async () => {
    if (user && !user.emailVerified) {
      const success = await sendVerificationEmail(user);
      if (success) {
        toast({
          title: "Verification Email Resent",
          description: `A new verification link has been sent to ${user.email}.`,
        });
        setEmailVerificationMessage(`A new verification link has been sent to ${user.email}. Please check your inbox.`);
      } else {
        toast({
          title: "Error Resending Email",
          description: authError?.message || "Could not resend verification email.",
          variant: "destructive",
        });
      }
    }
  };


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            JobFit AI Candidate Login
          </CardTitle>
          <CardDescription>
            Access your applications and profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && !emailVerificationMessage && ( // Only show general auth error if not showing verification message
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>
          )}
          {emailVerificationMessage && (
            <Alert variant="default" className="mb-4 border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-300">
              <MailWarning className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-700 dark:text-yellow-300">Email Verification Required</AlertTitle>
              <AlertDescription className="text-yellow-600 dark:text-yellow-200">
                {emailVerificationMessage}
                {user && !user.emailVerified && (
                  <Button variant="link" onClick={handleResendVerification} className="p-0 h-auto text-yellow-700 dark:text-yellow-300 hover:underline ml-1" disabled={loading}>
                    Resend verification email.
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email-candidate-auth">Email</Label>
              <Input id="email-candidate-auth" type="email" placeholder="you@example.com" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password-candidate-auth">Password</Label>
                    <Button
                        type="button"
                        variant="link"
                        className="text-xs h-auto p-0 text-primary"
                        onClick={handleForgotPassword}
                        disabled={loading}
                    >
                        Forgot Password?
                    </Button>
                </div>
              <Input
                id="password-candidate-auth"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...form.register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-7 h-7 w-7" // Adjusted top position
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !!emailVerificationMessage}>
              {loading ? <Loader size={20} className="mr-2" /> : <LogIn className="mr-2 h-5 w-5" />}
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
             <p className="text-sm">
                Don't have an account?{" "}
                <Button variant="link" asChild className="p-0 h-auto">
                    <Link href="/candidate/signup">Sign Up</Link>
                </Button>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
