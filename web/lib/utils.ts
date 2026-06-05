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

// Монохромный градиент-заглушка (тёмно-белый минимализм, без ярких цветов)
const GRADIENTS = [
  'from-neutral-800 to-neutral-700',
  'from-zinc-800 to-zinc-700',
  'from-stone-800 to-stone-700',
  'from-neutral-900 to-neutral-700',
  'from-zinc-900 to-zinc-700',
  'from-stone-900 to-stone-600',
];

export function trackGradient(id: string): string {
  let hash = 0;
  for (const c of id) {
    hash = ((hash << 5) - hash) + c.charCodeAt(0);
    hash |= 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// Убирает расширение аудиофайла из названия трека (.mp3, .wav, и т.д.)
export function cleanTrackTitle(raw: string): string {
  return raw.replace(/\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|aiff?)$/i, '').trim();
}
