'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown, Heart, Shuffle, SkipBack, SkipForward,
  Play, Pause, Repeat,
} from 'lucide-react';
import { cn, formatDuration, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { audioManager } from '@/lib/audioManager';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const LIKED_KEY = 'ms_liked_v2';

function getLiked(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function FullPlayer() {
  const isOpen    = usePlayerStore((s) => s.isFullPlayerOpen);
  const close     = usePlayerStore((s) => s.closeFullPlayer);
  const track     = usePlayerStore(selectCurrentTrack);
  const queue     = usePlayerStore((s) => s.queue);
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
      localStorage.setItem(LIKED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const handleSeek = (values: number[]) => {
    audioManager.seek(values[0]);
  };

  const curTime   = formatDuration(Math.floor((progress / 100) * duration));
  const totalTime = formatDuration(Math.floor(duration));

  return (
    <Drawer open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DrawerContent
        className="bg-[#111113] text-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Топ-бар */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
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

        {/* Обложка */}
        <div className="flex flex-1 items-center justify-center px-10 py-4"
             style={{ minHeight: 0 }}>
          <div
            className={cn(
              'w-full rounded-3xl overflow-hidden',
              !track?.thumbnail_file_id && `bg-gradient-to-br ${track ? trackGradient(track.id) : 'from-blue-950 to-indigo-600'}`
            )}
            style={{
              maxWidth: 300,
              maxHeight: 300,
              aspectRatio: '1 / 1',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            }}
          >
            {track?.thumbnail_file_id && (
              <img
                src={thumbnailUrl(track.thumbnail_file_id)}
                alt={track?.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Название + лайк */}
        <div className="flex items-start justify-between gap-3 px-6 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold truncate">{track?.title ?? '—'}</p>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {track?.artist ?? 'Unknown Artist'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 flex-shrink-0"
            onClick={handleLike}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
              )}
            />
          </Button>
        </div>

        {/* Прогресс-бар */}
        <div className="px-6 mb-2">
          <Slider
            value={[progress]}
            max={100}
            step={0.2}
            onValueChange={handleSeek}
          />
          <div className="flex justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">{curTime}</span>
            <span className="text-[11px] text-muted-foreground">{totalTime}</span>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex items-center justify-between px-6 mb-6">

          {/* Shuffle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full transition-colors',
              isShuffle ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            )}
            onClick={() => { haptic('light'); toggleShuffle(); }}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          {/* Предыдущий */}
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 rounded-full bg-white/8 hover:bg-white/12"
            onClick={() => { haptic('medium'); playPrev(); }}
          >
            <SkipBack className="h-5 w-5 fill-white text-white" />
          </Button>

          {/* Play / Pause — главная кнопка */}
          <Button
            variant="default"
            size="icon"
            className="h-20 w-20 rounded-full bg-primary shadow-2xl shadow-primary/40 hover:bg-primary/90 active:scale-95"
            onClick={() => { haptic('medium'); togglePlay(); }}
          >
            {isPlaying
              ? <Pause className="h-7 w-7 fill-white text-white" />
              : <Play  className="h-7 w-7 fill-white text-white" />
            }
          </Button>

          {/* Следующий */}
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 rounded-full bg-white/8 hover:bg-white/12"
            onClick={() => { haptic('medium'); playNext(); }}
          >
            <SkipForward className="h-5 w-5 fill-white text-white" />
          </Button>

          {/* Repeat */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full transition-colors',
              isRepeat ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
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
