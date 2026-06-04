'use client';

/**
 * Обновляет прогресс-бар и текущее время НАПРЯМУЮ через DOM (requestAnimationFrame),
 * полностью минуя React и Zustand.
 * Используй в компонентах, где нужен плавный 60-fps прогресс без ре-рендеров.
 */

import { useEffect, useRef } from 'react';
import { audioManager } from '@/lib/audioManager';
import { formatDuration } from '@/lib/utils';

interface ProgressRefs {
  /** Div, чья CSS-ширина (%) обновляется каждый кадр */
  bar?: React.RefObject<HTMLDivElement | null>;
  /** Span с текущим временем "0:00" */
  currentTime?: React.RefObject<HTMLSpanElement | null>;
  /** Span с полной длительностью — обновляется только при loadedmetadata */
  totalTime?: React.RefObject<HTMLSpanElement | null>;
}

export function useAudioProgress(refs: ProgressRefs) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioManager.getAudioElement();
    if (!audio) return;

    // Обновляем полную длительность при загрузке метаданных
    const onMeta = () => {
      if (refs.totalTime?.current && audio.duration) {
        refs.totalTime.current.textContent = formatDuration(audio.duration);
      }
    };
    audio.addEventListener('loadedmetadata', onMeta);
    // Если метаданные уже доступны — заполняем сразу
    if (audio.duration && refs.totalTime?.current) {
      refs.totalTime.current.textContent = formatDuration(audio.duration);
    }

    // rAF-цикл для прогресс-бара и текущего времени
    const tick = () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        if (refs.bar?.current) {
          refs.bar.current.style.width = `${pct}%`;
        }
        if (refs.currentTime?.current) {
          refs.currentTime.current.textContent = formatDuration(audio.currentTime);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener('loadedmetadata', onMeta);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
