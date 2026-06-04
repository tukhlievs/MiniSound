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

function CtrlBtn({ onClick, children, size = 'md' }: {
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      style={{ touchAction: 'manipulation' }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-full flex-shrink-0',
        'bg-white/[0.07] text-foreground',
        'transition-all duration-150 active:scale-[0.92] active:opacity-70',
        size === 'md' ? 'h-[56px] w-[56px]' : 'h-[44px] w-[44px]',
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
    ? `bg-gradient-to-br ${track ? trackGradient(track.id) : 'from-neutral-800 to-neutral-600'}`
    : undefined;

  return (
    <Drawer open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DrawerContent
        className="relative overflow-hidden text-foreground"
        style={{ background: 'hsl(0 0% 5%)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Очень тонкий арт-блюр — намёк на цвет, не кричащий */}
        {track?.thumbnail_file_id && (
          <div className="pointer-events-none absolute inset-0" aria-hidden style={{ zIndex: -1 }}>
            <img src={thumbnailUrl(track.thumbnail_file_id)} alt=""
                 draggable={false}
                 className="h-full w-full scale-110 object-cover"
                 style={{ filter: 'blur(72px) brightness(0.25) saturate(0.6)', opacity: 0.6 }} />
          </div>
        )}

        {/* Топ-бар */}
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <CtrlBtn size="sm" onClick={() => { haptic('light'); close(); }}>
            <ChevronDown className="h-4 w-4" />
          </CtrlBtn>
          <span className="text-[13px] font-medium text-muted-foreground">Сейчас играет</span>
          <div className="w-[44px]" />
        </div>

        {/* Обложка */}
        <div className="flex flex-1 items-center justify-center px-10 py-5" style={{ minHeight: 0 }}>
          <div className={cn('w-full overflow-hidden rounded-3xl', artBg)}
               style={{ aspectRatio: '1/1', maxWidth: 300, maxHeight: 300,
                        boxShadow: '0 24px 72px rgba(0,0,0,0.6)' }}>
            {track?.thumbnail_file_id && (
              <img src={thumbnailUrl(track.thumbnail_file_id)} alt={track?.title}
                   draggable={false} className="h-full w-full object-cover" />
            )}
          </div>
        </div>

        {/* Название + лайк */}
        <div className="flex items-start justify-between gap-3 px-6 mb-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[20px] font-bold leading-tight text-foreground">{track?.title ?? '—'}</p>
            <p className="mt-1 truncate text-[14px] text-muted-foreground">{track?.artist ?? 'Unknown Artist'}</p>
          </div>
          <button style={{ touchAction: 'manipulation' }}
                  className="mt-0.5 h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                  onClick={handleLike}>
            <Heart className={cn('h-6 w-6 transition-colors duration-200',
              isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
          </button>
        </div>

        {/* Слайдер */}
        <div className="mb-1 px-6">
          <Slider value={[progress]} max={100} step={0.1}
                  onValueChange={([v]) => audioManager.seek(v)} />
          <div className="mt-2 flex justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatDuration(Math.floor((progress / 100) * duration))}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatDuration(Math.floor(duration))}
            </span>
          </div>
        </div>

        {/* Контролы */}
        <div className="mb-6 flex items-center justify-between px-5">
          <button style={{ touchAction: 'manipulation' }}
                  onClick={() => { haptic('light'); toggleShuffle(); }}
                  className={cn('h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90',
                    isShuffle ? 'text-foreground' : 'text-muted-foreground')}>
            <Shuffle className="h-5 w-5" />
          </button>

          <CtrlBtn onClick={() => { haptic('medium'); playPrev(); }}>
            <SkipBack className="h-5 w-5 fill-foreground" />
          </CtrlBtn>

          {/* Белая кнопка — главный акцент */}
          <button
            style={{ touchAction: 'manipulation', background: 'rgba(255,255,255,0.92)' }}
            onClick={() => { haptic('medium'); togglePlay(); }}
            className="h-[72px] w-[72px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-[0.93]"
          >
            {isPlaying
              ? <Pause className="h-7 w-7 fill-black text-black" />
              : <Play  className="h-7 w-7 fill-black text-black ml-0.5" />}
          </button>

          <CtrlBtn onClick={() => { haptic('medium'); playNext(); }}>
            <SkipForward className="h-5 w-5 fill-foreground" />
          </CtrlBtn>

          <button style={{ touchAction: 'manipulation' }}
                  onClick={() => { haptic('light'); toggleRepeat(); }}
                  className={cn('h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90',
                    isRepeat ? 'text-foreground' : 'text-muted-foreground')}>
            <Repeat className="h-5 w-5" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
