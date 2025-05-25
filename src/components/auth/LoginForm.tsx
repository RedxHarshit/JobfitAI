// src/components/auth/LoginForm.tsx
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
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema for Email/Password Login
const emailLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Schema for Email/Password Sign Up
const emailSignUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type EmailLoginFormValues = z.infer<typeof emailLoginSchema>;
export type EmailSignUpFormValues = z.infer<typeof emailSignUpSchema>;


export function LoginForm() {
  const { 
    signIn, 
    signUp, 
    sendPasswordReset,
    sendVerificationEmail, 
    error: authError, 
    loading 
  } = useAuth();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const currentSchema = isSignUp ? emailSignUpSchema : emailLoginSchema;
  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(isSignUp && { confirmPassword: "" }),
    },
  });
  
  useEffect(() => {
    form.reset({
      email: "",
      password: "",
      ...(isSignUp && { confirmPassword: "" }),
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [isSignUp, form]);


  const handleEmailSubmit: SubmitHandler<z.infer<typeof currentSchema>> = async (data) => {
    if (isSignUp) {
      const { email, password } = data as EmailSignUpFormValues;
      const newUser = await signUp({ email, password });
      if (newUser) {
        await sendVerificationEmail(newUser);
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
        // Redirect is handled by useEffect in parent page (LoginPage/HomePage) based on user state
      } 
      // If newUser is null, authError will be set in AuthContext and displayed by the Alert component
    } else {
      await signIn(data as EmailLoginFormValues);
      // Errors/redirects handled similarly
    }
  };
  
  const toggleFormMode = () => {
    setIsSignUp(!isSignUp);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            {isSignUp ? "Create HR Account" : "Welcome to JobFit AI!"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Join JobFit AI today." : "Sign in to access your HR dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
            {authError && <Alert variant="destructive" className="mb-4">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{authError.message}</AlertDescription>
            </Alert>}
            
            <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email-auth">Email</Label>
                <Input id="email-auth" type="email" placeholder="you@example.com" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-sm text-destructive">{(form.formState.errors.email as any).message}</p>}
            </div>
            
            <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                <Label htmlFor="password-auth">Password</Label>
                {!isSignUp && (
                    <Button
                    type="button"
                    variant="link"
                    className="text-xs h-auto p-0 text-primary"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    >
                    Forgot Password?
                    </Button>
                )}
                </div>
                <Input 
                id="password-auth" 
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
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </Button>
                {form.formState.errors.password && <p className="text-sm text-destructive">{(form.formState.errors.password as any).message}</p>}
            </div>

            {isSignUp && (
                <div className="space-y-2 relative">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    {...form.register("confirmPassword" as any)} 
                />
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-7 h-7 w-7"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                    {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </Button>
                {form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{(form.formState.errors.confirmPassword as any).message}</p>}
                </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader size={20} className="mr-2" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5"/> : <LogIn className="mr-2 h-5 w-5"/>)}
                {loading ? (isSignUp ? "Creating Account..." : "Signing In...") : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
            <div className="text-center">
                <Button variant="link" onClick={toggleFormMode} className="text-sm" type="button">
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </Button>
            </div>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
