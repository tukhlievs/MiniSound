'use client';

import { useRef } from 'react';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';
import { cn, trackGradient, cleanTrackTitle } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { useAudioProgress } from '@/hooks/useAudioProgress';

const NAV_OFFSET = 88;

export function MiniPlayer() {
  const track     = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlay, playNext, playPrev, openFullPlayer } = usePlayerStore();
  const { haptic } = useTelegram();

  /* Прогресс-бар: rAF → прямое обновление DOM, без React re-renders */
  const barRef = useRef<HTMLDivElement>(null);
  useAudioProgress({ bar: barRef });

  if (!track) return null;

  const thumb = track.thumbnail_file_id ? thumbnailUrl(track.thumbnail_file_id) : null;
  const grad  = trackGradient(track.id);

  return (
    <div
      className="fixed left-3 right-3 z-50 animate-slide-up"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_OFFSET}px)` }}
    >
      {/* ── Основная карточка — 3-колоночный лэйаут à la Feishin ── */}
      <div
        className="flex items-center gap-2 rounded-[20px] bg-card px-2.5 py-2.5"
        style={{ boxShadow: '0 4px 28px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)' }}
      >
        {/* ЛЕВАЯ КОЛОНКА: обложка + название/исполнитель (тап → полный плеер) */}
        <button
          aria-label="Открыть плеер"
          onClick={() => { haptic('light'); openFullPlayer(); }}
          style={{ touchAction: 'manipulation' }}
          className="flex flex-1 min-w-0 items-center gap-2.5 text-left active:opacity-70 transition-opacity duration-100"
        >
          <div className={cn(
            'h-[44px] w-[44px] flex-shrink-0 overflow-hidden rounded-[11px]',
            !thumb && `bg-gradient-to-br ${grad}`,
          )}>
            {thumb && (
              <img src={thumb} alt="" draggable={false} className="h-full w-full object-cover" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground leading-tight">
              {cleanTrackTitle(track.title)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {track.artist ?? 'Unknown Artist'}
            </p>
          </div>
        </button>

        {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Prev | Play/Pause | Next */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            aria-label="Предыдущий трек"
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('light'); playPrev(); }}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground
                       active:opacity-50 transition-opacity duration-100"
          >
            <SkipBack className="h-[15px] w-[15px]" aria-hidden />
          </button>

          {/* Белая кнопка — главный акцент, 44px (min iOS touch target) */}
          <button
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            style={{ touchAction: 'manipulation', background: 'rgba(255,255,255,0.94)', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
            onClick={() => { haptic('medium'); togglePlay(); }}
            className="h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center
                       active:opacity-60 transition-opacity duration-100"
          >
            {isPlaying
              ? <Pause className="h-[14px] w-[14px] fill-black text-black" aria-hidden />
              : <Play  className="h-[14px] w-[14px] fill-black text-black" aria-hidden />}
          </button>

          <button
            aria-label="Следующий трек"
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('light'); playNext(); }}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground
                       active:opacity-50 transition-opacity duration-100"
          >
            <SkipForward className="h-[15px] w-[15px]" aria-hidden />
          </button>
        </div>
      </div>

      {/* Прогресс-полоска (обновляется через rAF без React) */}
      <div className="mx-2 mt-[5px] h-[2px] overflow-hidden rounded-full bg-white/10">
        <div ref={barRef} className="h-full rounded-full bg-white/65" style={{ width: '0%' }} />
      </div>
    </div>
  );
}
