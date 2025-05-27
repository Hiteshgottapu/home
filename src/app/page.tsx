
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { isAuthenticated, isLoading, firebaseUser } = useAuth(); // firebaseUser can also indicate auth state
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && firebaseUser) { // Check both for robustness
        router.replace('/dashboard'); 
      } else {
        router.replace('/auth/login');
      }
    }
  }, [isAuthenticated, firebaseUser, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
