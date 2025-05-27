
"use client";
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/layout/Sidebar'; // Will be kept for desktop
import { AppHeader } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar'; 
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
    <SidebarProvider defaultOpen={true}> {/* Keep SidebarProvider for desktop sidebar functionality */}
      <div className="flex min-h-screen w-full bg-muted/40">
        <AppSidebar /> {/* Desktop Sidebar */}
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 lg:p-8 md:pb-4"> {/* Added pb-20 for bottom nav space on mobile, md:pb-4 for normal padding on desktop */}
            {children}
          </main>
          <BottomNav /> {/* Mobile Bottom Navigation */}
        </div>
      </div>
    </SidebarProvider>
  );
}
