
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Phone, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/layout/AppLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

const PhoneSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+[1-9]\d{1,14}$/, "Enter a valid phone number with country code (e.g., +12223334444)"),
});
const OTPSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type PhoneFormValues = z.infer<typeof PhoneSchema>;
type OTPFormValues = z.infer<typeof OTPSchema>;

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export function LoginForm() {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const { loginWithPhoneNumber, confirmOtp, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && recaptchaContainerRef.current && !window.recaptchaVerifier && !isOtpSent) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
            // console.log("reCAPTCHA solved:", response);
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            toast({ title: "reCAPTCHA Expired", description: "Please try sending OTP again.", variant: "destructive" });
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.render().then((widgetId) => {
                 if (typeof widgetId === 'number') { // Check if widgetId is a number
                    window.recaptchaVerifier?.reset(widgetId);
                 } else {
                    window.recaptchaVerifier?.clear(); // Fallback if reset with widgetId is not possible
                 }
              }).catch(err => console.error("Error resetting reCAPTCHA", err));
            }
          }
        });
        window.recaptchaVerifier.render().catch(err => {
          console.error("Error rendering reCAPTCHA:", err);
          toast({ title: "reCAPTCHA Error", description: "Could not initialize reCAPTCHA. Check your Firebase setup and domain whitelisting.", variant: "destructive" });
        });
      } catch (error) {
        console.error("Error initializing RecaptchaVerifier:", error);
        toast({ title: "Setup Error", description: "Could not set up phone sign-in. Please refresh.", variant: "destructive"});
      }
    }
     // Cleanup reCAPTCHA on component unmount or if OTP is sent
    return () => {
      if (window.recaptchaVerifier && (isOtpSent || !recaptchaContainerRef.current)) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, [isClient, isOtpSent, toast]);

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(PhoneSchema),
    defaultValues: { phone: '' }
  });

  const otpForm = useForm<OTPFormValues>({
    resolver: zodResolver(OTPSchema),
    defaultValues: { otp: '' }
  });

  const handleSendOtp: SubmitHandler<PhoneFormValues> = async (data) => {
    if (!window.recaptchaVerifier) {
      toast({ title: "reCAPTCHA Not Ready", description: "Please wait a moment for reCAPTCHA to load.", variant: "destructive" });
      return;
    }
    try {
      const confirmationResult = await loginWithPhoneNumber(data.phone, window.recaptchaVerifier);
      if (confirmationResult) {
        window.confirmationResult = confirmationResult;
        setPhoneNumber(data.phone);
        setIsOtpSent(true);
        toast({
          title: "OTP Sent",
          description: `A 6-digit code has been sent to ${data.phone}.`,
        });
      }
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Please check the phone number or try again.",
        variant: "destructive",
      });
       if (window.recaptchaVerifier) {
          window.recaptchaVerifier.render().then((widgetId) => {
            if (typeof widgetId === 'number') {
                window.recaptchaVerifier?.reset(widgetId);
            } else {
               window.recaptchaVerifier?.clear();
            }
          }).catch(err => console.error("Error resetting reCAPTCHA after failed OTP send", err));
        }
    }
  };

  const handleVerifyOtp: SubmitHandler<OTPFormValues> = async (data) => {
    if (!window.confirmationResult) {
      toast({ title: "Verification Error", description: "No OTP confirmation context found. Please try sending OTP again.", variant: "destructive" });
      setIsOtpSent(false); // Reset to phone input
      return;
    }
    try {
      const success = await confirmOtp(window.confirmationResult, data.otp);
      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome to VitaLog Pro!",
        });
        // Navigation will be handled by AuthContext's onAuthStateChanged
      } else {
        // This case might not be hit if confirmOtp throws error for failure
        toast({ title: "Login Failed", description: "Invalid OTP. Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "OTP Verification Failed",
        description: error.message || "Invalid OTP or an error occurred.",
        variant: "destructive",
      });
      otpForm.reset(); // Clear OTP input
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <div ref={recaptchaContainerRef}></div> {/* Container for reCAPTCHA */}
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <AppLogo className="justify-center" iconSize={40} textSize="text-3xl" />
          <CardTitle className="text-2xl font-semibold">Welcome to VitaLog Pro</CardTitle>
          <CardDescription>Your AI-Powered Health Navigator. Proactive, Personalized, Securely Yours.</CardDescription>
        </CardHeader>
        <CardContent>
          {isClient ? (
            <>
              {!isOtpSent ? (
                <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          type="tel"
                          placeholder="e.g., +12223334444" 
                          {...phoneForm.register("phone")}
                          className="pl-10"
                        />
                      </div>
                      {phoneForm.formState.errors.phone && <p className="text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={authLoading || phoneForm.formState.isSubmitting}
                    >
                      {authLoading || phoneForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send OTP
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP Code</Label>
                       <p className="text-sm text-muted-foreground">A 6-digit code has been sent to {phoneNumber}. Enter it to continue.</p>
                      <div className="relative">
                         <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="otp" 
                          type="text" 
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          {...otpForm.register("otp")}
                          className="pl-10 tracking-[0.3em] text-center"
                        />
                      </div>
                      {otpForm.formState.errors.otp && <p className="text-sm text-destructive">{otpForm.formState.errors.otp.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={authLoading || otpForm.formState.isSubmitting}>
                      {authLoading || otpForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Verify & Login
                    </Button>
                    <Button variant="link" type="button" onClick={() => {setIsOtpSent(false); window.confirmationResult = undefined;}} className="w-full text-primary">
                      Change Phone Number
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            // Skeleton Loader
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              {isOtpSent && <Skeleton className="h-10 w-full" />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
