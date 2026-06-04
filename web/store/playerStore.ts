import { create } from 'zustand';
import type { Track } from '@/types';

interface PlayerState {
  queue:            Track[];
  currentIndex:     number;   // -1 = ничего не играет
  isPlaying:        boolean;
  isShuffle:        boolean;
  isRepeat:         boolean;
  progress:         number;   // 0–100
  duration:         number;   // секунды
  isFullPlayerOpen: boolean;

  // ── Actions ──────────────────────────────────────────────
  playTrack:       (track: Track, queue: Track[]) => void;
  togglePlay:      () => void;
  playNext:        () => void;
  playPrev:        () => void;
  toggleShuffle:   () => void;
  toggleRepeat:    () => void;
  setProgress:     (n: number)  => void;
  setDuration:     (n: number)  => void;
  setIsPlaying:    (b: boolean) => void;
  openFullPlayer:  () => void;
  closeFullPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue:            [],
  currentIndex:     -1,
  isPlaying:        false,
  isShuffle:        false,
  isRepeat:         false,
  progress:         0,
  duration:         0,
  isFullPlayerOpen: false,

  playTrack: (track, queue) => {
    const idx = queue.findIndex((t) => t.id === track.id);
    set({
      queue,
      currentIndex: idx >= 0 ? idx : 0,
      isPlaying:    true,
      progress:     0,
      duration:     track.duration ?? 0,
    });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  playNext: () => {
    const { queue, currentIndex, isShuffle } = get();
    if (!queue.length) return;
    const next = isShuffle
      ? Math.floor(Math.random() * queue.length)
      : (currentIndex + 1) % queue.length;
    set({ currentIndex: next, progress: 0 });
  },

  playPrev: () => {
    const { queue, currentIndex } = get();
    if (!queue.length) return;
    const prev = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentIndex: prev, progress: 0 });
  },

  toggleShuffle:   () => set((s) => ({ isShuffle:   !s.isShuffle })),
  toggleRepeat:    () => set((s) => ({ isRepeat:    !s.isRepeat })),
  setProgress:     (n) => set({ progress: n }),
  setDuration:     (n) => set({ duration: n }),
  setIsPlaying:    (b) => set({ isPlaying: b }),
  openFullPlayer:  () => set({ isFullPlayerOpen: true }),
  closeFullPlayer: () => set({ isFullPlayerOpen: false }),
}));

// Селекторы — используются в компонентах через usePlayerStore(selector)
export const selectCurrentTrack = (s: PlayerState): Track | null =>
  s.currentIndex >= 0 && s.queue[s.currentIndex]
    ? s.queue[s.currentIndex]
    : null;
