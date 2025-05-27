import { Inter } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // CSS variable to be used in globals.css or layout
  display: 'swap', // Ensures text remains visible during font loading
});
