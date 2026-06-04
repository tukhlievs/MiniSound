import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return '';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = String(s % 60).padStart(2, '0');
  return `${m}:${rem}`;
}

// Стабильный градиент по id трека (не зависит от позиции в списке)
const GRADIENTS = [
  'from-blue-950 to-indigo-600',
  'from-purple-950 to-fuchsia-600',
  'from-emerald-950 to-teal-500',
  'from-rose-950 to-red-500',
  'from-amber-950 to-yellow-500',
  'from-cyan-950 to-sky-500',
];

export function trackGradient(id: string): string {
  let hash = 0;
  for (const c of id) {
    hash = ((hash << 5) - hash) + c.charCodeAt(0);
    hash |= 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
