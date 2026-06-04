/**
 * Singleton HTMLAudioElement — инициализируется только на клиенте.
 * setProgress вызывается не чаще 8 раз в секунду (throttle 125 ms),
 * чтобы не заставлять React перерисовывать компоненты на каждый timeupdate.
 * Для плавного прогресс-бара используй useAudioProgress (rAF, без React).
 */

import { usePlayerStore } from '@/store/playerStore';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private initialized = false;
  private lastProgressTs = 0;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.attachListeners();
  }

  /** Возвращает нативный элемент для прямых DOM-обновлений (rAF) */
  getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  load(src: string) {
    const el = this.audio;
    if (!el) return;
    el.src = src;
    el.load();
    el.play().catch(() => usePlayerStore.getState().setIsPlaying(false));
  }

  play()  { this.audio?.play().catch(() => usePlayerStore.getState().setIsPlaying(false)); }
  pause() { this.audio?.pause(); }

  /** pct: 0–100 */
  seek(pct: number) {
    const el = this.audio;
    if (!el || !el.duration) return;
    el.currentTime = (pct / 100) * el.duration;
  }

  private attachListeners() {
    const el = this.audio!;

    el.addEventListener('timeupdate', () => {
      if (!el.duration) return;
      const now = Date.now();
      // Обновляем store не чаще 8 fps — FullPlayer Slider не нужен 60 fps
      if (now - this.lastProgressTs < 125) return;
      this.lastProgressTs = now;
      usePlayerStore.getState().setProgress((el.currentTime / el.duration) * 100);
    });

    el.addEventListener('loadedmetadata', () => {
      usePlayerStore.getState().setDuration(el.duration);
    });

    el.addEventListener('play',  () => usePlayerStore.getState().setIsPlaying(true));
    el.addEventListener('pause', () => usePlayerStore.getState().setIsPlaying(false));

    el.addEventListener('ended', () => {
      const { isRepeat, playNext } = usePlayerStore.getState();
      if (isRepeat) { el.currentTime = 0; el.play(); }
      else playNext();
    });

    el.addEventListener('error', () => usePlayerStore.getState().setIsPlaying(false));
  }
}

export const audioManager = new AudioManager();
