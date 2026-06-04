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

/** Круглая кнопка управления (Prev / Next) */
function ControlBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      style={{ touchAction: 'manipulation' }}
      onClick={onClick}
      className={cn(
        'h-[56px] w-[56px] flex-shrink-0 rounded-full',
        'flex items-center justify-center',
        'bg-black/[0.06] text-foreground',
        'transition-all duration-150 active:scale-[0.92] active:opacity-70',
      )}
    >
      {children}
    </button>
  );
}

export function FullPlayer() {
  const isOpen    = usePlayerStore((s) => s.isFullPlayerOpen);
  const close     = usePlayerStore((s) => s.closeFullPlayer);
  const track     = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress  = usePlayerStore((s) => s.progress);
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
      localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const artBg = !track?.thumbnail_file_id
    ? `bg-gradient-to-br ${track ? trackGradient(track.id) : 'from-blue-400 to-indigo-500'}`
    : undefined;

  return (
    <Drawer open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DrawerContent
        className="relative overflow-hidden bg-card text-foreground"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* ── Размытый арт-фон (очень светлый, почти незаметный) ── */}
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
              style={{ filter: 'blur(64px) brightness(1.7) saturate(0.8)', opacity: 0.35 }}
            />
          </div>
        )}

        {/* ── Топ-бар ── */}
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-black/[0.06] text-foreground hover:bg-black/10"
            onClick={() => { haptic('light'); close(); }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <span className="text-[13px] font-medium text-muted-foreground">Сейчас играет</span>
          <div className="w-9" />
        </div>

        {/* ── Обложка ── */}
        <div className="flex flex-1 items-center justify-center px-10 py-5" style={{ minHeight: 0 }}>
          <div
            className={cn('w-full overflow-hidden rounded-3xl', artBg)}
            style={{
              aspectRatio: '1/1',
              maxWidth: 300, maxHeight: 300,
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
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
            <p className="truncate text-[20px] font-bold leading-tight text-foreground">
              {track?.title ?? '—'}
            </p>
            <p className="mt-1 truncate text-[14px] text-muted-foreground">
              {track?.artist ?? 'Unknown Artist'}
            </p>
          </div>
          <button
            style={{ touchAction: 'manipulation' }}
            className="mt-0.5 h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full active:scale-90 transition-transform"
            onClick={handleLike}
          >
            <Heart className={cn(
              'h-6 w-6 transition-colors duration-200',
              isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
            )} />
          </button>
        </div>

        {/* ── Слайдер ── */}
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

          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('light'); toggleShuffle(); }}
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90',
              isShuffle ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Shuffle className="h-5 w-5" />
          </button>

          <ControlBtn onClick={() => { haptic('medium'); playPrev(); }}>
            <SkipBack className="h-5 w-5 fill-foreground" />
          </ControlBtn>

          {/* Главная кнопка */}
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('medium'); togglePlay(); }}
            className={cn(
              'h-[72px] w-[72px] rounded-full flex items-center justify-center flex-shrink-0',
              'bg-primary text-white',
              'shadow-lg shadow-primary/30',
              'transition-all duration-150 active:scale-[0.93]',
            )}
          >
            {isPlaying
              ? <Pause className="h-7 w-7 fill-white text-white" />
              : <Play  className="h-7 w-7 fill-white text-white ml-0.5" />}
          </button>

          <ControlBtn onClick={() => { haptic('medium'); playNext(); }}>
            <SkipForward className="h-5 w-5 fill-foreground" />
          </ControlBtn>

          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('light'); toggleRepeat(); }}
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90',
              isRepeat ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Repeat className="h-5 w-5" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
