
"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, KeyRound, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/layout/AppLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const LoginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const SignUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormValues = z.infer<typeof LoginSchema>;
type SignUpFormValues = z.infer<typeof SignUpSchema>;

export function LoginForm() {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const { loginWithEmailPassword, signUpWithEmailPassword, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const currentSchema = isSignUpMode ? SignUpSchema : LoginSchema;
  const form = useForm<LoginFormValues | SignUpFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(isSignUpMode && { name: '' }),
    },
  });

  useEffect(() => {
    form.reset({
      email: '',
      password: '',
      name: isSignUpMode ? '' : undefined,
    });
  }, [isSignUpMode, form.reset]);


  const handleSubmitAuth: SubmitHandler<LoginFormValues | SignUpFormValues> = async (data) => {
    console.log("handleSubmitAuth called. Current isSignUpMode:", isSignUpMode, "Submitting data:", data);
    try {
      if (isSignUpMode) {
        const signUpData = data as SignUpFormValues;
        if (!signUpData.name) {
          console.error("Sign up attempt missing name field in data:", signUpData);
          toast({
            title: "Sign Up Failed",
            description: "Name is required for sign up.",
            variant: "destructive",
          });
          return;
        }
        await signUpWithEmailPassword(signUpData.email, signUpData.password, signUpData.name);
        toast({
          title: "Sign Up Successful",
          description: "Welcome to VitaLog Pro! You are now logged in.",
        });
      } else {
        const loginData = data as LoginFormValues;
        const success = await loginWithEmailPassword(loginData.email, loginData.password);
        if (success) {
          toast({
            title: "Login Successful",
            description: "Welcome back to VitaLog Pro!",
          });
        } else {
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error(`Auth Error (isSignUpMode: ${isSignUpMode}):`, error, "Data:", data);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please log in or use a different email.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. It should be at least 6 characters.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
             errorMessage = 'Invalid email or password.';
             break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: isSignUpMode ? "Sign Up Failed" : "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <AppLogo className="justify-center" iconSize={40} textSize="text-3xl" />
          <CardTitle className="text-2xl font-semibold">
            {isSignUpMode ? "Create an Account" : "Welcome to VitaLog Pro"}
          </CardTitle>
          <CardDescription>
            {isSignUpMode ? "Join us to manage your health proactively." : "Your AI-Powered Health Navigator. Securely Yours."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClient ? (
            <form
              key={isSignUpMode ? 'signup-form' : 'login-form'}
              onSubmit={form.handleSubmit(handleSubmitAuth)}
              className="space-y-6"
            >
              <div className="space-y-4">
                {isSignUpMode && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="e.g., Alex Ryder"
                        {...form.register("name" as any)}
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.name && <p className="text-sm text-destructive">{(form.formState.errors.name as any).message}</p>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., user@example.com"
                      {...form.register("email")}
                      className="pl-10"
                    />
                  </div>
                  {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...form.register("password")}
                      className="pl-10"
                    />
                  </div>
                  {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={authLoading || form.formState.isSubmitting}
                >
                  {authLoading || form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSignUpMode ? "Sign Up" : "Login"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {isSignUpMode && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4 mb-1" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
            <Button variant="link" type="button" onClick={() => setIsSignUpMode(!isSignUpMode)} className="w-full text-primary">
              {isSignUpMode ? "Already have an account? Login" : "Don't have an account? Sign Up"}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    