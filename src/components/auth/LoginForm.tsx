
// src/components/auth/LoginForm.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
import { Eye, EyeOff, LogIn, UserPlus, MailQuestion, PhoneIcon, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConfirmationResult } from "firebase/auth";

const emailLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const emailSignUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  optionalPhoneNumber: z.string().optional().describe("Optional phone number for the user."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Phone number seems too short" }).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (e.g., +11234567890)"),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits" }),
});

export type EmailLoginFormValues = z.infer<typeof emailLoginSchema>;
export type EmailSignUpFormValues = Omit<z.infer<typeof emailSignUpSchema>, 'confirmPassword'>;
export type PhoneFormValues = z.infer<typeof phoneSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;


export function LoginForm() {
  const { 
    signIn, 
    signUp, 
    sendPasswordReset, 
    signInWithPhone, 
    confirmPhoneOtp,
    initializeRecaptcha,
    error: authError, 
    loading 
  } = useAuth();
  const { toast } = useToast();

  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState("");

  const emailForm = useForm<z.infer<typeof emailLoginSchema> | z.infer<typeof emailSignUpSchema>>({
    resolver: zodResolver(isSignUp ? emailSignUpSchema : emailLoginSchema),
    defaultValues: isSignUp ? { email: "", password: "", confirmPassword: "", optionalPhoneNumber: "" } : { email: "", password: "" },
  });
  
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "" },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("LoginForm: authMethod changed to", authMethod);
    if (authMethod === "phone" && recaptchaContainerRef.current && !window.recaptchaVerifierInstance) {
        console.log("LoginForm useEffect: Attempting to initialize reCAPTCHA because it's not on window and phone tab is active.");
        initializeRecaptcha('recaptcha-container');
    }
    // Optional: Cleanup reCAPTCHA if switching away from phone tab.
    // return () => {
    //   if (window.recaptchaVerifierInstance && authMethod !== 'phone') {
    //     window.recaptchaVerifierInstance.clear();
    //     window.recaptchaVerifierInstance = undefined; // Or handle this in AuthContext
    //     console.log("LoginForm: Cleared reCAPTCHA on tab switch from phone.");
    //   }
    // };
  }, [authMethod, initializeRecaptcha]); // Removed recaptchaContainerRef as it's stable


  const handleEmailSubmit: SubmitHandler<any> = async (data) => {
    if (isSignUp) {
      const { email, password, optionalPhoneNumber } = data as z.infer<typeof emailSignUpSchema>;
      await signUp({ email, password, phone: optionalPhoneNumber });
    } else {
      await signIn(data as EmailLoginFormValues);
    }
  };
  
  const handleSendOtp: SubmitHandler<PhoneFormValues> = async (data) => {
    if (authMethod === "phone" && recaptchaContainerRef.current && !window.recaptchaVerifierInstance) {
        console.warn("handleSendOtp: Attempting to initialize reCAPTCHA as it seems not ready. This is a fallback.");
        initializeRecaptcha('recaptcha-container'); // Ensure it's initialized if useEffect didn't catch it
    }

    const result = await signInWithPhone(data.phoneNumber);
    if (result) {
      setConfirmationResult(result);
      setCurrentPhoneNumber(data.phoneNumber);
      setOtpSent(true);
      toast({ title: "OTP Sent", description: `An OTP has been sent to ${data.phoneNumber}.` });
    } else {
      toast({ title: "OTP Send Failed", description: authError?.message || "Could not send OTP. Please check the console for errors.", variant: "destructive" });
    }
  };

  const handleVerifyOtp: SubmitHandler<OtpFormValues> = async (data) => {
    if (confirmationResult) {
      await confirmPhoneOtp(confirmationResult, data.otp);
    } else {
      toast({ title: "Verification Error", description: "OTP confirmation result not found. Please try sending OTP again.", variant: "destructive" });
    }
  };
  
  const toggleFormMode = () => {
    setIsSignUp(!isSignUp);
    emailForm.reset(isSignUp ? { email: "", password: "" } : { email: "", password: "", confirmPassword: "", optionalPhoneNumber: "" });
    if (authMethod === "phone") {
        phoneForm.reset();
        otpForm.reset();
        setOtpSent(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = emailForm.getValues("email");
    if (!email || emailForm.formState.errors.email) {
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
            {isSignUp && authMethod === "email" ? "Create Account" : "Welcome!"}
          </CardTitle>
          <CardDescription>
            {isSignUp && authMethod === "email" ? "Join TalentFlow AI today." : 
             authMethod === "email" ? "Sign in to access your dashboard." : 
             "Sign in or sign up using your phone number."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMethod} onValueChange={(value) => {
            const newAuthMethod = value as "email" | "phone";
            setAuthMethod(newAuthMethod);
            setIsSignUp(false); 
            emailForm.reset(); 
            phoneForm.reset(); 
            otpForm.reset();
            setOtpSent(false);
            if (newAuthMethod === 'phone' && recaptchaContainerRef.current && !window.recaptchaVerifierInstance) {
              console.log("LoginForm Tabs onValueChange: Attempting to initialize reCAPTCHA for phone tab.");
              initializeRecaptcha('recaptcha-container');
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email/Password</TabsTrigger>
              <TabsTrigger value="phone">Phone Number</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-6">
              {authError && authMethod === "email" && <Alert variant="destructive" className="mb-4">
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{authError.message}</AlertDescription>
              </Alert>}
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email-auth">Email</Label>
                  <Input id="email-auth" type="email" placeholder="you@example.com" {...emailForm.register("email")} />
                  {emailForm.formState.errors.email && <p className="text-sm text-destructive">{(emailForm.formState.errors.email as any).message}</p>}
                </div>
                
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="optionalPhoneNumber">Phone Number (Optional)</Label>
                    <Input id="optionalPhoneNumber" type="tel" placeholder="e.g., +1 555 123 4567" {...emailForm.register("optionalPhoneNumber" as any)} />
                    {emailForm.formState.errors.optionalPhoneNumber && <p className="text-sm text-destructive">{(emailForm.formState.errors.optionalPhoneNumber as any).message}</p>}
                  </div>
                )}

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
                    {...emailForm.register("password")} 
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
                  {emailForm.formState.errors.password && <p className="text-sm text-destructive">{(emailForm.formState.errors.password as any).message}</p>}
                </div>

                {isSignUp && (
                  <div className="space-y-2 relative">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      {...emailForm.register("confirmPassword" as any)} 
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
                    {emailForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{(emailForm.formState.errors.confirmPassword as any).message}</p>}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader size={20} className="mr-2" /> : (isSignUp ? <UserPlus className="mr-2"/> : <LogIn className="mr-2"/>)}
                  {loading ? (isSignUp ? "Creating Account..." : "Signing In...") : (isSignUp ? "Sign Up" : "Sign In")}
                </Button>
                <div className="text-center">
                  <Button variant="link" onClick={toggleFormMode} className="text-sm">
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="phone" className="mt-6">
               {authError && authMethod === "phone" && <Alert variant="destructive" className="mb-4">
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{authError.message}</AlertDescription>
              </Alert>}
              
              {/* This div must be present in the DOM for reCAPTCHA. Firebase manages its visibility for invisible reCAPTCHA. */}
              <div id="recaptcha-container" ref={recaptchaContainerRef} className="my-4"></div>

              {!otpSent ? (
                <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" type="tel" placeholder="+11234567890" {...phoneForm.register("phoneNumber")} />
                    {phoneForm.formState.errors.phoneNumber && <p className="text-sm text-destructive">{phoneForm.formState.errors.phoneNumber.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader size={20} className="mr-2" /> : <PhoneIcon className="mr-2"/>}
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6">
                  <p className="text-sm text-center text-muted-foreground">
                    Enter the OTP sent to {currentPhoneNumber}.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="otp">OTP Code</Label>
                    <Input id="otp" type="text" placeholder="123456" {...otpForm.register("otp")} maxLength={6}/>
                    {otpForm.formState.errors.otp && <p className="text-sm text-destructive">{otpForm.formState.errors.otp.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader size={20} className="mr-2" /> : <KeyRound className="mr-2"/>}
                    {loading ? "Verifying OTP..." : "Verify OTP & Sign In/Up"}
                  </Button>
                  <Button variant="link" onClick={() => { setOtpSent(false); phoneForm.reset(); otpForm.reset(); }} className="text-sm w-full">
                    Change phone number or resend OTP
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
