'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Heart,
  Shuffle, SkipBack, SkipForward, Play, Pause, Repeat,
} from 'lucide-react';
import { cn, formatDuration, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { audioManager } from '@/lib/audioManager';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { Slider } from '@/components/ui/slider';

const LIKED_KEY = 'ms_liked_v2';
function getLiked(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? '[]')); }
  catch { return new Set(); }
}

function CtrlBtn({ onClick, label, children, size = 'md' }: {
  onClick: () => void; label: string;
  children: React.ReactNode; size?: 'sm' | 'md';
}) {
  return (
    <button
      aria-label={label}
      style={{ touchAction: 'manipulation' }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-full flex-shrink-0',
        'bg-white/[0.08] text-foreground',
        'transition-all duration-100 active:scale-[0.92] active:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'md' ? 'h-[56px] w-[56px]' : 'h-[42px] w-[42px]',
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

  // Свайп вниз для закрытия
  const swipeStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { swipeStartY.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - swipeStartY.current > 80) close();
  };

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

  const thumb   = track?.thumbnail_file_id ? thumbnailUrl(track.thumbnail_file_id) : null;
  const artBg   = !thumb ? `bg-gradient-to-br ${track ? trackGradient(track.id) : 'from-neutral-800 to-neutral-600'}` : undefined;
  const curTime = formatDuration(Math.floor((progress / 100) * duration));
  const totTime = formatDuration(Math.floor(duration));

  return (
    <>
      {/* ── Затемняющий оверлей ── */}
      <div
        className="fixed inset-0 z-[55] bg-black/55 transition-opacity duration-350"
        style={{
          opacity:        isOpen ? 1 : 0,
          pointerEvents:  isOpen ? 'auto' : 'none',
        }}
        onClick={close}
        aria-hidden
      />

      {/* ── Полный плеер — slides up/down через translateY ── */}
      <div
        className="fixed inset-x-0 bottom-0 top-0 z-[60] flex flex-col overflow-hidden text-foreground"
        style={{
          background:   'hsl(0 0% 4%)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          transform:     isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition:    'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange:    'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ручка для свайпа */}
        <div className="mx-auto mt-4 mb-1 h-1 w-10 flex-shrink-0 rounded-full bg-white/20" />

        {/* ── Динамический фон из обложки ── */}
        {thumb && (
          <div className="pointer-events-none absolute inset-0" aria-hidden style={{ zIndex: -1 }}>
            <img src={thumb} alt="" draggable={false}
                 className="h-full w-full scale-110 object-cover"
                 style={{ filter: 'blur(80px) brightness(0.22) saturate(0.5)', opacity: 0.7 }} />
            <div className="absolute inset-0"
                 style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.97) 60%)' }} />
          </div>
        )}

        {/* ── Топ-бар ── */}
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <CtrlBtn size="sm" label="Свернуть плеер" onClick={() => { haptic('light'); close(); }}>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </CtrlBtn>
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Сейчас играет
          </span>
          <div className="w-[42px]" />
        </div>

        {/* ── Обложка ── */}
        <div className="flex flex-1 items-center justify-center px-10 py-4" style={{ minHeight: 0 }}>
          <div
            className={cn('w-full overflow-hidden rounded-[28px]', artBg)}
            style={{ aspectRatio: '1/1', maxWidth: 295, maxHeight: 295,
                     boxShadow: '0 28px 80px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {thumb && (
              <img src={thumb} alt={track?.title} draggable={false}
                   className="h-full w-full object-cover" />
            )}
          </div>
        </div>

        {/* ── Название + лайк ── */}
        <div className="flex items-center gap-3 px-6 mb-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[20px] font-bold leading-tight text-foreground">
              {track?.title ?? '—'}
            </p>
            <p className="mt-1 truncate text-[14px] text-muted-foreground">
              {track?.artist ?? 'Unknown Artist'}
            </p>
          </div>
          <button aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
                  aria-pressed={isLiked}
                  style={{ touchAction: 'manipulation' }}
                  onClick={handleLike}
                  className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full active:scale-[0.88] transition-transform duration-100">
            <Heart className={cn('h-[22px] w-[22px] transition-colors duration-200',
              isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} aria-hidden />
          </button>
        </div>

        {/* ── Слайдер прогресса ── */}
        <div className="px-6 mb-1">
          <Slider value={[progress]} max={100} step={0.1}
                  aria-label="Перемотка"
                  onValueChange={([v]) => audioManager.seek(v)} />
          <div className="mt-2 flex justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">{curTime}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{totTime}</span>
          </div>
        </div>

        {/* ── Контролы ── */}
        <div className="mb-5 flex items-center justify-between px-5">
          <button aria-label="Перемешать" aria-pressed={isShuffle}
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => { haptic('light'); toggleShuffle(); }}
                  className={cn('h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-[0.88] duration-100',
                    isShuffle ? 'text-foreground' : 'text-muted-foreground/60')}>
            <Shuffle className="h-5 w-5" aria-hidden />
          </button>

          <CtrlBtn label="Предыдущий трек" onClick={() => { haptic('medium'); playPrev(); }}>
            <SkipBack className="h-5 w-5 fill-foreground" aria-hidden />
          </CtrlBtn>

          <button aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
                  style={{ touchAction: 'manipulation', background: 'rgba(255,255,255,0.95)' }}
                  onClick={() => { haptic('medium'); togglePlay(); }}
                  className="h-[76px] w-[76px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-100 active:scale-[0.93]">
            {isPlaying
              ? <Pause className="h-7 w-7 fill-black text-black" aria-hidden />
              : <Play  className="h-7 w-7 fill-black text-black ml-0.5" aria-hidden />}
          </button>

          <CtrlBtn label="Следующий трек" onClick={() => { haptic('medium'); playNext(); }}>
            <SkipForward className="h-5 w-5 fill-foreground" aria-hidden />
          </CtrlBtn>

          <button aria-label="Повтор" aria-pressed={isRepeat}
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => { haptic('light'); toggleRepeat(); }}
                  className={cn('h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-[0.88] duration-100',
                    isRepeat ? 'text-foreground' : 'text-muted-foreground/60')}>
            <Repeat className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
