
// src/components/auth/LoginForm.tsx
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
import { Eye, EyeOff, LogIn, UserPlus, MailQuestion } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional().describe("Optional phone number for the user."), // Added phone
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignUpFormValues = Omit<z.infer<typeof signUpSchema>, 'confirmPassword'>;


export function LoginForm() {
  const { signIn, signUp, sendPasswordReset, error: authError, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();


  const currentSchema = isSignUp ? signUpSchema : loginSchema;
  type CurrentFormValues = z.infer<typeof currentSchema>;

  const { register, handleSubmit, formState: { errors }, reset, getValues } = useForm<CurrentFormValues>({
    resolver: zodResolver(currentSchema),
  });

  const onSubmit: SubmitHandler<CurrentFormValues> = async (data) => {
    if (isSignUp) {
      const { email, password, phone } = data as z.infer<typeof signUpSchema>;
      await signUp({ email, password, phone });
    } else {
      await signIn(data as LoginFormValues);
    }
  };
  
  const toggleFormMode = () => {
    setIsSignUp(!isSignUp);
    reset(); 
  };

  const handleForgotPassword = async () => {
    const email = getValues("email");
    if (!email || errors.email) {
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
      // AuthContext will set authError, which is displayed
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
            {isSignUp ? "Create Account" : "Welcome Back!"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Join TalentFlow AI today." : "Sign in to access your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{(errors.email as any).message}</p>}
            </div>
            
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input id="phone" type="tel" placeholder="e.g., +1 555 123 4567" {...register("phone")} />
                {errors.phone && <p className="text-sm text-destructive">{(errors.phone as any).message}</p>}
              </div>
            )}

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
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
                id="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                {...register("password")} 
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-7 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </Button>
              {errors.password && <p className="text-sm text-destructive">{(errors.password as any).message}</p>}
            </div>

            {isSignUp && (
              <div className="space-y-2 relative">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••" 
                  {...register("confirmPassword")} 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-7 h-7 w-7"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </Button>
                {errors.confirmPassword && <p className="text-sm text-destructive">{(errors.confirmPassword as any).message}</p>}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader size={20} className="mr-2" /> : (isSignUp ? <UserPlus className="mr-2"/> : <LogIn className="mr-2"/>)}
              {loading ? (isSignUp ? "Creating Account..." : "Signing In...") : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Button variant="link" onClick={toggleFormMode} className="text-sm">
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    