'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown, Heart,
  Shuffle, SkipBack, SkipForward, Play, Pause, Repeat,
} from 'lucide-react';
import { cn, formatDuration, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { audioManager } from '@/lib/audioManager';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Slider }  from '@/components/ui/slider';
import { Button }  from '@/components/ui/button';

const LIKED_KEY = 'ms_liked_v2';

function getLiked(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? '[]')); }
  catch { return new Set(); }
}

export function FullPlayer() {
  const isOpen    = usePlayerStore((s) => s.isFullPlayerOpen);
  const close     = usePlayerStore((s) => s.closeFullPlayer);
  const track     = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress  = usePlayerStore((s) => s.progress);   // 8 fps — OK для Slider
  const duration  = usePlayerStore((s) => s.duration);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const isRepeat  = usePlayerStore((s) => s.isRepeat);
  const { togglePlay, playNext, playPrev, toggleShuffle, toggleRepeat } = usePlayerStore();
  const { haptic } = useTelegram();

  const [liked, setLiked] = useState<Set<string>>(new Set());
  useEffect(() => { setLiked(getLiked()); }, []);

  const isLiked = track ? liked.has(track.id) : false;

  const handleLike = () => {
    if (!track) return;
    haptic('medium');
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(track.id) ? next.delete(track.id) : next.add(track.id);
      localStorage.setItem(LIKED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const artBg = track?.thumbnail_file_id ? undefined : `bg-gradient-to-br ${track ? trackGradient(track.id) : ''}`;

  return (
    <Drawer open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      {/* relative + overflow-hidden нужны для позиционирования фонового арта */}
      <DrawerContent
        className="relative overflow-hidden text-foreground"
        style={{
          background:    'hsl(225 55% 6%)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        {/* ── Размытый арт за контентом (Apple Music effect) ── */}
        {track?.thumbnail_file_id && (
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{ zIndex: -1 }}
          >
            <img
              src={thumbnailUrl(track.thumbnail_file_id)}
              alt=""
              draggable={false}
              className="h-full w-full scale-110 object-cover"
              style={{ filter: 'blur(56px) brightness(0.18) saturate(1.6)' }}
            />
            {/* Градиент: сверху полупрозрачный, снизу почти непрозрачный */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(6,9,26,0.55) 0%, rgba(6,9,26,0.97) 65%)',
              }}
            />
          </div>
        )}

        {/* ── Топ-бар ── */}
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/6"
            onClick={() => { haptic('light'); close(); }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <span className="text-[13px] font-medium text-muted-foreground">
            Сейчас играет
          </span>
          <div className="w-9" />
        </div>

        {/* ── Обложка ── */}
        <div className="flex flex-1 items-center justify-center px-10 py-5" style={{ minHeight: 0 }}>
          <div
            className={cn('w-full overflow-hidden rounded-3xl', artBg)}
            style={{
              aspectRatio: '1/1',
              maxWidth:    300,
              maxHeight:   300,
              boxShadow:   '0 28px 72px rgba(0,0,0,0.75)',
            }}
          >
            {track?.thumbnail_file_id && (
              <img
                src={thumbnailUrl(track.thumbnail_file_id)}
                alt={track.title}
                draggable={false}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>

        {/* ── Название + лайк ── */}
        <div className="flex items-start justify-between gap-3 px-6 mb-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[19px] font-bold leading-tight text-foreground">
              {track?.title ?? '—'}
            </p>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">
              {track?.artist ?? 'Unknown Artist'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-9 w-9 flex-shrink-0"
            onClick={handleLike}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
              )}
            />
          </Button>
        </div>

        {/* ── Слайдер прогресса (Zustand @ 8 fps) ── */}
        <div className="mb-1 px-6">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={([v]) => audioManager.seek(v)}
          />
          <div className="mt-2 flex justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatDuration(Math.floor((progress / 100) * duration))}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatDuration(Math.floor(duration))}
            </span>
          </div>
        </div>

        {/* ── Кнопки управления ── */}
        <div className="mb-6 flex items-center justify-between px-5">

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full transition-colors',
              isShuffle ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
            )}
            onClick={() => { haptic('light'); toggleShuffle(); }}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="h-[56px] w-[56px] rounded-full bg-white/8 hover:bg-white/12"
            onClick={() => { haptic('medium'); playPrev(); }}
          >
            <SkipBack className="h-5 w-5 fill-foreground text-foreground" />
          </Button>

          {/* Главная кнопка воспроизведения */}
          <Button
            variant="default"
            size="icon"
            className="h-20 w-20 rounded-full bg-primary shadow-2xl shadow-primary/35 hover:bg-primary/90"
            onClick={() => { haptic('medium'); togglePlay(); }}
          >
            {isPlaying
              ? <Pause className="h-7 w-7 fill-white text-white" />
              : <Play  className="h-7 w-7 fill-white text-white" />}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="h-[56px] w-[56px] rounded-full bg-white/8 hover:bg-white/12"
            onClick={() => { haptic('medium'); playNext(); }}
          >
            <SkipForward className="h-5 w-5 fill-foreground text-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full transition-colors',
              isRepeat ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
            )}
            onClick={() => { haptic('light'); toggleRepeat(); }}
          >
            <Repeat className="h-5 w-5" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
