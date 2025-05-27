
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, type NavItem } from './navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background/95 shadow-top backdrop-blur-sm md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 p-2 text-muted-foreground transition-all duration-200 ease-in-out hover:text-primary",
              isActive && "text-primary scale-105"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className={cn("h-6 w-6 shrink-0", isActive ? "fill-primary/20" : "")} strokeWidth={isActive ? 2.5 : 2} />
            <span className={cn("text-xs", isActive ? "font-semibold" : "font-normal")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
