'use client';

/**
 * Headless-компонент: монтируется один раз в layout.tsx.
 * Управляет HTMLAudioElement через audioManager.
 * Не рендерит никакого UI.
 */

import { useEffect, useRef } from 'react';
import { audioManager } from '@/lib/audioManager';
import { streamUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';

export function AudioController() {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const playNext     = usePlayerStore((s) => s.playNext);
  const prevTrackId  = useRef<string | null>(null);

  // Инициализируем audioManager один раз на клиенте
  useEffect(() => {
    audioManager.init();
  }, []);

  // Смена трека → загружаем и сразу играем
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.id === prevTrackId.current) return;
    prevTrackId.current = currentTrack.id;
    audioManager.load(streamUrl(currentTrack.audio_file_id));
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Синхронизируем play/pause
  useEffect(() => {
    if (isPlaying) {
      audioManager.play();
    } else {
      audioManager.pause();
    }
  }, [isPlaying]);

  // Подписываемся на playNext из store (для обработки ended)
  useEffect(() => {
    void playNext; // проброс в audioManager происходит через store.getState() внутри audioManager
  }, [playNext]);

  return null;
}
