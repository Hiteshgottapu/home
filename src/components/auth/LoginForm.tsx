
"use client";

import { useState, useEffect } from 'react';
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

const OTPSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+[1-9]\d{1,14}$/, "Enter a valid phone number with country code (e.g., +12223334444)"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type OTPFormValues = z.infer<typeof OTPSchema>;

export function LoginForm() {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const { login, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<OTPFormValues>({
    resolver: zodResolver(OTPSchema),
    defaultValues: {
      phone: '',
      otp: '',
    }
  });

  const currentPhone = watch("phone");

  const handleSendOtp = () => {
    if (!/^\+[1-9]\d{1,14}$/.test(currentPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number with country code.",
        variant: "destructive",
      });
      return;
    }
    setPhoneNumber(currentPhone);
    setIsOtpSent(true);
    toast({
      title: "OTP Sent",
      description: `A 6-digit code has been securely sent to ${currentPhone}. (Hint: Use 123456 for mock login)`,
    });
  };

  const onSubmit: SubmitHandler<OTPFormValues> = async (data) => {
    const success = await login(data.phone, data.otp);
    if (!success) {
      toast({
        title: "Login Failed",
        description: "Invalid phone number or OTP. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome to VitaLog Pro!",
      });
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <AppLogo className="justify-center" iconSize={40} textSize="text-3xl" />
          <CardTitle className="text-2xl font-semibold">Welcome to VitaLog Pro</CardTitle>
          <CardDescription>Your AI-Powered Health Navigator. Proactive, Personalized, Securely Yours.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {isClient ? (
              <>
                {!isOtpSent ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          type="tel"
                          placeholder="e.g., +12223334444" 
                          {...register("phone")}
                          className="pl-10"
                        />
                      </div>
                      {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleSendOtp} 
                      className="w-full" 
                      disabled={authLoading || isSubmitting}
                    >
                      {authLoading || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send OTP
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP Code</Label>
                       <p className="text-sm text-muted-foreground">A 6-digit code has been securely sent to {phoneNumber}. Enter it to continue.</p>
                      <div className="relative">
                         <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="otp" 
                          type="text" 
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          {...register("otp")}
                          className="pl-10 tracking-[0.3em] text-center"
                        />
                      </div>
                      {errors.otp && <p className="text-sm text-destructive">{errors.otp.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={authLoading || isSubmitting}>
                      {authLoading || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Verify & Login
                    </Button>
                    <Button variant="link" type="button" onClick={() => setIsOtpSent(false)} className="w-full text-primary">
                      Change Phone Number
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                {!isOtpSent ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/4 mb-1" /> {/* Label */}
                      <Skeleton className="h-10 w-full" /> {/* Input */}
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/4 mb-1" /> {/* Label */}
                      <Skeleton className="h-4 w-3/4 mb-1" /> {/* Paragraph */}
                      <Skeleton className="h-10 w-full" /> {/* Input */}
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                  </div>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
