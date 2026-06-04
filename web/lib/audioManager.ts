/**
 * Singleton-менеджер HTMLAudioElement.
 * Инициализируется только на клиенте (typeof window проверка).
 * Любой компонент может вызывать audioManager.seek() / .play() / .pause() напрямую.
 */

import { usePlayerStore } from '@/store/playerStore';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.attachListeners();
  }

  // Загружает новый трек и начинает воспроизведение
  load(src: string) {
    const el = this.audio;
    if (!el) return;
    el.src = src;
    el.load();
    el.play().catch(() => {
      usePlayerStore.getState().setIsPlaying(false);
    });
  }

  play() {
    this.audio?.play().catch(() => {
      usePlayerStore.getState().setIsPlaying(false);
    });
  }

  pause() {
    this.audio?.pause();
  }

  // pct: 0–100
  seek(pct: number) {
    const el = this.audio;
    if (!el || !el.duration) return;
    el.currentTime = (pct / 100) * el.duration;
  }

  private attachListeners() {
    const el = this.audio!;

    el.addEventListener('timeupdate', () => {
      if (!el.duration) return;
      usePlayerStore.getState().setProgress((el.currentTime / el.duration) * 100);
    });

    el.addEventListener('loadedmetadata', () => {
      usePlayerStore.getState().setDuration(el.duration);
    });

    el.addEventListener('play', () => {
      usePlayerStore.getState().setIsPlaying(true);
    });

    el.addEventListener('pause', () => {
      usePlayerStore.getState().setIsPlaying(false);
    });

    el.addEventListener('ended', () => {
      const { isRepeat, playNext } = usePlayerStore.getState();
      if (isRepeat) {
        el.currentTime = 0;
        el.play();
      } else {
        playNext();
      }
    });

    el.addEventListener('error', () => {
      usePlayerStore.getState().setIsPlaying(false);
    });
  }
}

export const audioManager = new AudioManager();
