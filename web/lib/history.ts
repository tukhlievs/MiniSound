'use client';

import type { Track } from '@/types';

// Локальная история прослушиваний (localStorage). Используется для авто-плейлистов.
const KEY = 'ms_history_v1';
export const HISTORY_EVENT = 'ms:history';

export interface HistoryEntry {
  count:  number;        // сколько раз запускали
  lastTs: number;        // timestamp последнего запуска
  genre:  string | null;
  artist: string | null;
}
export type HistoryMap = Record<string, HistoryEntry>;

export function getHistory(): HistoryMap {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as HistoryMap; }
  catch { return {}; }
}

// Записывает факт запуска трека и оповещает подписчиков (авто-плейлисты).
export function recordPlay(track: Track): void {
  if (typeof window === 'undefined') return;
  const h    = getHistory();
  const prev = h[track.id];
  h[track.id] = {
    count:  (prev?.count ?? 0) + 1,
    lastTs: Date.now(),
    genre:  track.genre  ?? null,
    artist: track.artist ?? null,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(h));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch { /* quota — игнорируем */ }
}
