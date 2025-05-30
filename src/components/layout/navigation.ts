
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BarChart3, BotMessageSquare, UserCog, FileScan } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/insights', label: 'Insights Hub', icon: BarChart3 },
  { href: '/script-recognizer', label: 'Script Reader', icon: FileScan },
  { href: '/ai-assistant', label: 'AI Assistant', icon: BotMessageSquare },
  { href: '/profile', label: 'Profile', icon: UserCog },
];
