'use client';

import { useRef } from 'react';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';
import { cn, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { Button } from '@/components/ui/button';

export function MiniPlayer() {
  const track     = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlay, playNext, playPrev, openFullPlayer } = usePlayerStore();
  const { haptic } = useTelegram();

  // Прогресс-бар и время обновляются напрямую через DOM (rAF) —
  // не подписываемся на progress/duration из Zustand, нет re-renders.
  const barRef  = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  useAudioProgress({ bar: barRef, currentTime: timeRef });

  if (!track) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 animate-slide-up"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
    >
      {/* ── Основная карточка ── */}
      <div
        className="glass flex cursor-pointer items-center gap-3 rounded-[20px] px-3 py-2.5"
        style={{ touchAction: 'manipulation' }}
        onClick={() => { haptic('light'); openFullPlayer(); }}
      >
        {/* Обложка — с кольцом-пульсом при воспроизведении */}
        <div
          className={cn(
            'relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-[13px]',
            !track.thumbnail_file_id && `bg-gradient-to-br ${trackGradient(track.id)}`,
          )}
        >
          {track.thumbnail_file_id && (
            <img
              src={thumbnailUrl(track.thumbnail_file_id)}
              alt={track.title}
              draggable={false}
              className="h-full w-full object-cover"
            />
          )}
          {/* Тонкое свечение при воспроизведении */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-[13px] ring-1 ring-primary/40 ring-inset animate-pulse-soft" />
          )}
        </div>

        {/* Название + исполнитель */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground leading-tight">
            {track.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {track.artist ?? 'Unknown Artist'}
          </p>
        </div>

        {/* Текущее время (обновляется через rAF без React) */}
        <span
          ref={timeRef}
          className="font-mono text-[10px] text-muted-foreground flex-shrink-0"
        >
          0:00
        </span>

        {/* Prev */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); haptic('light'); playPrev(); }}
        >
          <SkipBack className="h-[15px] w-[15px]" />
        </Button>

        {/* Play / Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-[38px] w-[38px] flex-shrink-0 rounded-full bg-primary shadow-lg shadow-primary/25"
          onClick={(e) => { e.stopPropagation(); haptic('light'); togglePlay(); }}
        >
          {isPlaying
            ? <Pause className="h-[13px] w-[13px] fill-white text-white" />
            : <Play  className="h-[13px] w-[13px] fill-white text-white" />}
        </Button>

        {/* Next */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); haptic('light'); playNext(); }}
        >
          <SkipForward className="h-[15px] w-[15px]" />
        </Button>
      </div>

      {/* ── Полоска прогресса — обновляется через rAF, ширина меняется напрямую ── */}
      <div className="mx-3 mt-[5px] h-[2px] overflow-hidden rounded-full bg-white/10">
        <div
          ref={barRef}
          className="h-full rounded-full bg-primary"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
}
