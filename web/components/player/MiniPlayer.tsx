'use client';

import { useRef } from 'react';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';
import { cn, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { Button } from '@/components/ui/button';

const NAV_OFFSET = 88;

export function MiniPlayer() {
  const track     = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlay, playNext, playPrev, openFullPlayer } = usePlayerStore();
  const { haptic } = useTelegram();

  const barRef = useRef<HTMLDivElement>(null);
  useAudioProgress({ bar: barRef });

  if (!track) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 animate-slide-up"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_OFFSET}px)` }}
    >
      <div
        className="flex items-center gap-2 rounded-[22px] bg-card px-3 py-2.5"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.06)' }}
      >
        {/* Открыть полный плеер — отдельная кнопка (обложка + название) */}
        <button
          aria-label="Открыть плеер"
          onClick={() => { haptic('light'); openFullPlayer(); }}
          style={{ touchAction: 'manipulation' }}
          className="flex flex-1 items-center gap-3 min-w-0 text-left active:opacity-70 transition-opacity"
        >
          <div className={cn(
            'h-11 w-11 flex-shrink-0 overflow-hidden rounded-[12px]',
            !track.thumbnail_file_id && `bg-gradient-to-br ${trackGradient(track.id)}`,
          )}>
            {track.thumbnail_file_id && (
              <img src={thumbnailUrl(track.thumbnail_file_id)} alt=""
                   draggable={false} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground leading-tight">{track.title}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{track.artist ?? 'Unknown Artist'}</p>
          </div>
        </button>

        <Button variant="ghost" size="icon"
          aria-label="Предыдущий трек"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => { haptic('light'); playPrev(); }}>
          <SkipBack className="h-[15px] w-[15px]" aria-hidden />
        </Button>

        {/* Белая кнопка play/pause */}
        <Button variant="default" size="icon"
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          className="h-[38px] w-[38px] flex-shrink-0 rounded-full"
          style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
          onClick={() => { haptic('light'); togglePlay(); }}>
          {isPlaying
            ? <Pause className="h-[13px] w-[13px] fill-black text-black" aria-hidden />
            : <Play  className="h-[13px] w-[13px] fill-black text-black" aria-hidden />}
        </Button>

        <Button variant="ghost" size="icon"
          aria-label="Следующий трек"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => { haptic('light'); playNext(); }}>
          <SkipForward className="h-[15px] w-[15px]" aria-hidden />
        </Button>
      </div>

      {/* Прогресс-бар (обновляется через rAF) */}
      <div className="mx-3 mt-[5px] h-[2px] overflow-hidden rounded-full bg-white/10">
        <div ref={barRef} className="h-full rounded-full bg-white/70" style={{ width: '0%' }} />
      </div>
    </div>
  );
}
