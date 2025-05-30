
"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, KeyRound, User, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/layout/AppLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { loginWithEmailPassword, signUpWithEmailPassword, isLoading: authLoading, firebaseInitError } = useAuth();
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
    console.log(`LoginForm (useEffect for mode switch): Mode switched. isSignUpMode is now: ${isSignUpMode}. Resetting form and re-validating resolver.`);
    form.reset({
      email: '',
      password: '',
      ...(isSignUpMode ? { name: '' } : { name: undefined }),
    });
  }, [isSignUpMode, form]);


  const handleSubmitAuth: SubmitHandler<LoginFormValues | SignUpFormValues> = async (data) => {
    if (firebaseInitError) {
      toast({
        title: "Service Unavailable",
        description: "Login/Signup is temporarily unavailable due to a configuration issue. Please see details on the page.",
        variant: "destructive",
      });
      return;
    }

    const operationMode = isSignUpMode ? 'Sign Up' : 'Login';
    console.log(`LoginForm (handleSubmitAuth BEGIN): Intending to ${operationMode}. isSignUpMode: ${isSignUpMode}. Submitted Data (password omitted):`, { ...data, password: '***' });

    try {
      if (isSignUpMode) {
        const signUpData = data as SignUpFormValues;
        if (!signUpData.name) {
          console.error("LoginForm (handleSubmitAuth - SignUp): Name is missing (should be caught by Zod).", signUpData);
          toast({
            title: "Sign Up Failed",
            description: "Name is required for sign up.",
            variant: "destructive",
          });
          return;
        }
        console.log("LoginForm (handleSubmitAuth - SignUp): Calling signUpWithEmailPassword from AuthContext.");
        await signUpWithEmailPassword(signUpData.email, signUpData.password, signUpData.name);
        toast({
          title: "Sign Up Successful",
          description: "Welcome to VitaLog Pro! Redirecting...",
        });
      } else {
        const loginData = data as LoginFormValues;
        console.log("LoginForm (handleSubmitAuth - Login): Calling loginWithEmailPassword from AuthContext.");
        const success = await loginWithEmailPassword(loginData.email, loginData.password);
        if (success) {
          console.log("LoginForm (handleSubmitAuth - Login): loginWithEmailPassword returned true.");
          toast({
            title: "Login Successful",
            description: "Welcome back to VitaLog Pro! Redirecting...",
          });
        } else {
          console.error(`LoginForm (handleSubmitAuth - Login): loginWithEmailPassword returned false. This typically means invalid credentials or user does not exist as handled by AuthContext.`);
          // AuthContext now handles the specific toast for invalid credentials
          // This path is taken if loginWithEmailPassword returns false for reasons other than throwing (though currently it always throws or succeeds)
           toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      const currentModeForErrorToast = isSignUpMode ? 'Sign Up' : 'Login';
      console.error(`LoginForm (handleSubmitAuth CATCH): Error during ${currentModeForErrorToast}. isSignUpMode was: ${isSignUpMode}. Firebase Error Code: ${error.code}, Message: ${error.message}. Submitted Data (password omitted):`, { ...data, password: '***' }, "Full Error Object:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (isSignUpMode && error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please log in or use a different email.';
            console.warn("LoginForm (handleSubmitAuth CATCH - Sign Up): Encountered 'auth/email-already-in-use'. User-friendly message will be shown.");
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. It should be at least 6 characters.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (!isSignUpMode && error.code === 'auth/invalid-credential') {
         // This specific case is now handled by loginWithEmailPassword returning false and AuthContext logging it.
         // The toast here will be more generic, which is fine.
        errorMessage = 'Invalid email or password. Please check your credentials.';
        console.warn("LoginForm (handleSubmitAuth CATCH - Login): Encountered 'auth/invalid-credential'. This means Firebase rejected the login. A generic error message is shown by LoginForm, specific warning by AuthContext.");
      } else if (!isSignUpMode) {
         errorMessage = 'Login attempt failed. Please check your credentials or try again later.';
      }
      
      toast({
        title: `${currentModeForErrorToast} Failed`,
        description: errorMessage,
        variant: "destructive",
      });
    }
    console.log(`LoginForm (handleSubmitAuth END): Operation ${operationMode} finished processing.`);
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <AppLogo className="justify-center" iconSize={40} textSize="text-3xl" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full mx-auto" />
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Skeleton for potential sign-up name field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
          <CardFooter className="text-center">
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }

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
          {firebaseInitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>System Configuration Error</AlertTitle>
              <AlertDescription>
                Login/Signup is temporarily unavailable. Please ensure your Firebase environment variables (API Key, Auth Domain, Project ID) are correctly set in the <code>.env</code> file and restart the server.
                <br />
                <span className="text-xs mt-1 block">Details: {firebaseInitError}</span>
              </AlertDescription>
            </Alert>
          )}
          <form
            key={isSignUpMode ? 'signup-form' : 'login-form'} // Crucial for re-initializing RHF on mode change
            onSubmit={form.handleSubmit(handleSubmitAuth)}
            className="space-y-6"
          >
            {isSignUpMode && (
              <div className="space-y-2">
                <Label htmlFor="name-input">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name-input"
                    type="text"
                    placeholder="e.g., John Doe"
                    {...form.register("name" as any)} // RHF knows 'name' is for SignUpFormValues
                    className={`pl-10 ${form.formState.errors.name ? "border-destructive" : ""}`}
                    disabled={authLoading || !!firebaseInitError}
                  />
                </div>
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email-input">Email Address</Label>
               <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email-input" // Unique ID for label association
                    type="email"
                    placeholder="e.g., user@example.com"
                    {...form.register("email")}
                    className={`pl-10 ${form.formState.errors.email ? "border-destructive" : ""}`}
                    disabled={authLoading || !!firebaseInitError}
                  />
              </div>
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-input">Password</Label>
              <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password-input" // Unique ID
                    type="password"
                    placeholder="••••••••"
                    {...form.register("password")}
                    className={`pl-10 ${form.formState.errors.password ? "border-destructive" : ""}`}
                    disabled={authLoading || !!firebaseInitError}
                  />
              </div>
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full text-base py-3" disabled={authLoading || !!firebaseInitError}>
              {authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUpMode ? <User className="mr-2 h-5 w-5" /> : <KeyRound className="mr-2 h-5 w-5" />)}
              {authLoading ? 'Processing...' : (isSignUpMode ? 'Create Account' : 'Login')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUpMode ? "Already have an account?" : "Don't have an account?"}{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-primary hover:underline"
              onClick={() => setIsSignUpMode(!isSignUpMode)}
              type="button" // Important: type="button" to prevent form submission
              disabled={authLoading || !!firebaseInitError}
            >
              {isSignUpMode ? 'Login here' : 'Sign up now'}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

