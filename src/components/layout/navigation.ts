
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BotMessageSquare, UserCog, FileScan } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/script-recognizer', label: 'Script Reader', icon: FileScan },
  { href: '/health-assistant', label: 'AI Assistant', icon: BotMessageSquare },
  { href: '/profile', label: 'Profile', icon: UserCog },
];
