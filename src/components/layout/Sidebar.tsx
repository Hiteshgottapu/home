"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'; // Assuming this is the complex ShadCN sidebar
import { AppLogo } from './AppLogo';
import { NAV_ITEMS, NavItem } from './navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { state, toggleSidebar, isMobile, open } = useSidebar();


  const CollapsibleControl = () => (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 bg-background hover:bg-muted border rounded-full h-7 w-7 p-0">
      {state === 'expanded' ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar" // Use 'sidebar' for standard full-height sidebar
      className="border-r bg-card" // Use card for a slightly distinct background if needed, or sidebar-background
      style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3.5rem' } as React.CSSProperties}
    >
      {!isMobile && state === 'expanded' && <CollapsibleControl />}
      <SidebarHeader className="p-4">
        <AppLogo showText={state === 'expanded' || isMobile} iconSize={state === 'expanded' || isMobile ? 28 : 24} />
      </SidebarHeader>

      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  tooltip={{ children: item.label, side: 'right', hidden: state === 'expanded' || isMobile }}
                  className="justify-start"
                  aria-label={item.label}
                >
                  <item.icon className="shrink-0" size={state === 'expanded' || isMobile ? 20 : 24} />
                  {(state === 'expanded' || isMobile) && <span>{item.label}</span>}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
         <Link href="/profile" passHref legacyBehavior>
            <SidebarMenuButton 
              tooltip={{ children: "Settings", side: 'right', hidden: state === 'expanded' || isMobile }}
              className="justify-start"
              aria-label="Settings"
            >
                <Settings className="shrink-0" size={state === 'expanded' || isMobile ? 20 : 24}/>
                {(state === 'expanded' || isMobile) && <span>Settings</span>}
            </SidebarMenuButton>
        </Link>
        <SidebarMenuButton 
            onClick={logout}
            tooltip={{ children: "Logout", side: 'right', hidden: state === 'expanded' || isMobile}}
            className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 active:text-destructive"
            aria-label="Logout"
        >
            <LogOut className="shrink-0" size={state === 'expanded' || isMobile ? 20 : 24}/>
            {(state === 'expanded' || isMobile) && <span>Logout</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
