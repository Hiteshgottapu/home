
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BotMessageSquare, UserCog, FileScan, MessageCircleQuestion } from 'lucide-react'; // Added MessageCircleQuestion

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/script-recognizer', label: 'Script Reader', icon: FileScan },
  { href: '/health-assistant', label: 'AI Health Companion', icon: BotMessageSquare },
  { href: '/openai-chat', label: 'OpenAI Chat', icon: MessageCircleQuestion }, // New AI Assistant
  { href: '/profile', label: 'Profile', icon: UserCog },
];
