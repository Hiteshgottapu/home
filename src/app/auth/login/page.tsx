
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth state is not loading and user is authenticated, redirect.
    if (!authIsLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authIsLoading, router]);

  // Show a loader while auth state is being determined,
  // or if user is authenticated and waiting for redirect.
  if (authIsLoading || (!authIsLoading && isAuthenticated)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        {(!authIsLoading && isAuthenticated) && <p className="ml-4">Redirecting to dashboard...</p>}
      </div>
    );
  }

  // If not loading and not authenticated, show the login form.
  return <LoginForm />;
}
