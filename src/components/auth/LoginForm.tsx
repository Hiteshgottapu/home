
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

  // Effect to reset form when switching modes (Login/Sign Up)
  useEffect(() => {
    console.log(`LoginForm: Mode switched. isSignUpMode is now: ${isSignUpMode}. Resetting form.`);
    form.reset({
      email: '',
      password: '',
      ...(isSignUpMode ? { name: '' } : { name: undefined }), // Critical for Zod not to validate 'name' in login mode
    });
  }, [isSignUpMode, form.reset]);


  const handleSubmitAuth: SubmitHandler<LoginFormValues | SignUpFormValues> = async (data) => {
    const mode = isSignUpMode ? 'Sign Up' : 'Login';
    console.log(`LoginForm: handleSubmitAuth called. Mode: ${mode}. Submitting data (password omitted):`, { ...data, password: '***' });

    try {
      if (isSignUpMode) {
        const signUpData = data as SignUpFormValues;
        // Zod schema should catch if name is missing, but an explicit check doesn't hurt
        if (!signUpData.name) {
          console.error("LoginForm: Sign up attempt missing name (should be caught by Zod):", signUpData);
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
          description: "Welcome to VitaLog Pro! Redirecting...",
        });
        // Redirection will be handled by LoginPage observing AuthContext.isAuthenticated
      } else {
        const loginData = data as LoginFormValues;
        console.log(`LoginForm: Attempting login for email: ${loginData.email}`);
        const success = await loginWithEmailPassword(loginData.email, loginData.password);
        if (success) {
          toast({
            title: "Login Successful",
            description: "Welcome back to VitaLog Pro! Redirecting...",
          });
          // Redirection handled by LoginPage
        } else {
          // AuthContext.loginWithEmailPassword returned false, meaning a Firebase error occurred (e.g., invalid-credential)
          console.error(`LoginForm: Login attempt failed for email ${loginData.email}. AuthContext.loginWithEmailPassword returned false.`);
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.", // Generic message as AuthContext handles specific Firebase error logging
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      // This catch block is primarily for signUpWithEmailPassword errors, as loginWithEmailPassword returns false.
      const currentModeForError = isSignUpMode ? 'Sign Up' : 'Login';
      console.error(`LoginForm: Auth Error in handleSubmitAuth (Mode: ${currentModeForError}). Error Code: ${error.code}, Message: ${error.message}. Submitted Data:`, { ...data, password: '***' }, "Full Error Object:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (isSignUpMode && error.code) { // Specific errors for sign-up
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please log in or use a different email.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. It should be at least 6 characters.';
            break;
          // Add other specific Firebase error codes for signup as needed
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (!isSignUpMode) {
        // This path might be taken if loginWithEmailPassword in AuthContext re-throws an error unexpectedly,
        // or if an error occurs *before* calling it.
        // However, current AuthContext.login returns false for known Firebase errors.
        errorMessage = 'Login attempt failed. Please check your credentials or try again later.';
      }
      toast({
        title: isSignUpMode ? "Sign Up Failed" : "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Render skeletons if not client-side yet (to prevent hydration mismatches on initial load)
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <AppLogo className="justify-center" iconSize={40} textSize="text-3xl" />
            <Skeleton className="h-6 w-3/4 mx-auto" /> {/* Placeholder for title */}
            <Skeleton className="h-4 w-full mx-auto" /> {/* Placeholder for description */}
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {isSignUpMode && ( // Show name field skeleton only in signup mode conceptually
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
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
            <Skeleton className="h-4 w-3/4 mx-auto" /> {/* Placeholder for toggle text */}
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
          <form
            key={isSignUpMode ? 'signup-form' : 'login-form'} // Force re-render on mode change
            onSubmit={form.handleSubmit(handleSubmitAuth)}
            className="space-y-6"
          >
            {isSignUpMode && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., John Doe"
                    {...form.register("name" as any)} // Cast as any if 'name' is conditionally in the form type
                    className={`pl-10 ${form.formState.errors.name ? "border-destructive" : ""}`}
                    disabled={authLoading}
                  />
                </div>
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
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
                    className={`pl-10 ${form.formState.errors.email ? "border-destructive" : ""}`}
                    disabled={authLoading}
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
                    placeholder="••••••••"
                    {...form.register("password")}
                    className={`pl-10 ${form.formState.errors.password ? "border-destructive" : ""}`}
                    disabled={authLoading}
                  />
              </div>
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full text-base py-3" disabled={authLoading}>
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
              type="button" // Ensure it's not treated as a submit button
              disabled={authLoading}
            >
              {isSignUpMode ? 'Login here' : 'Sign up now'}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
