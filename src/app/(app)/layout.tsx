
"use client";
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, firebaseUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !firebaseUser)) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, firebaseUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !firebaseUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Redirecting to login...</p>
        <Loader2 className="ml-2 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-20"> {/* Consistent pb-20 for bottom nav space */}
          {children}
        </main>
        <BottomNav /> {/* Bottom Navigation for all screen sizes */}
      </div>
    </div>
  );
}
