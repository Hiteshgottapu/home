
"use client";
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/layout/Sidebar';
import { AppHeader } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar'; 

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, firebaseUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !firebaseUser)) { // Check both for robustness
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-muted/40">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
