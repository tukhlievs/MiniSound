'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Heart,
  Shuffle, SkipBack, SkipForward, Play, Pause, Repeat,
} from 'lucide-react';
import { cn, formatDuration, trackGradient, cleanTrackTitle } from '@/lib/utils';
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

// Объёмная вторичная кнопка (prev / next)
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
        'ms-ctrl flex items-center justify-center rounded-full flex-shrink-0 text-foreground',
        'transition-all duration-100 active:scale-[0.90] active:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'md' ? 'h-[58px] w-[58px]' : 'h-[42px] w-[42px]',
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
  const onTouchStart = (e: React.TouchEvent) => { swipeStartY.current = e.touches[0].clientY; };
  const onTouchEnd   = (e: React.TouchEvent) => {
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
      {/* Затемняющий оверлей */}
      <div
        className="fixed inset-0 z-[55] bg-black/55 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={close}
        aria-hidden
      />

      {/* Панель плеера — slide up через translateY (надёжно в Telegram WebView) */}
      <div
        className="fixed inset-x-0 bottom-0 top-0 z-[60] flex flex-col overflow-hidden bg-background text-foreground"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          transform:     isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition:    'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange:    'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Размытый арт-фон (адаптивно под тему) */}
        {thumb && (
          <div className="pointer-events-none absolute inset-0" aria-hidden style={{ zIndex: -1 }}>
            <img src={thumb} alt="" draggable={false}
                 className="player-bg-img h-full w-full scale-110 object-cover" />
            <div className="player-bg-fade absolute inset-0" />
          </div>
        )}

        {/* Ручка свайпа */}
        <div className="mx-auto mt-3 mb-1 h-1 w-9 flex-shrink-0 rounded-full bg-foreground/20" />

        {/* Топ-бар */}
        <div className="flex items-center justify-between px-5 pb-1 pt-1.5">
          <CtrlBtn size="sm" label="Свернуть плеер" onClick={() => { haptic('light'); close(); }}>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </CtrlBtn>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Сейчас играет
          </span>
          <div className="w-[42px]" />
        </div>

        {/* Обложка — крупная, с многослойной тенью (3D-приподнятость) */}
        <div className="flex flex-1 items-center justify-center px-9 py-5" style={{ minHeight: 0 }}>
          <div
            className={cn('ms-art w-full overflow-hidden rounded-[26px]', artBg)}
            style={{ aspectRatio: '1/1', maxWidth: 300, maxHeight: 300 }}
          >
            {thumb && (
              <img src={thumb} alt={track ? cleanTrackTitle(track.title) : ''} draggable={false}
                   className="h-full w-full object-cover" />
            )}
          </div>
        </div>

        {/* Название + лайк */}
        <div className="mb-5 flex items-center gap-3 px-7">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[21px] font-bold leading-tight text-foreground">
              {track ? cleanTrackTitle(track.title) : '—'}
            </p>
            <p className="mt-1 truncate text-[14px] text-muted-foreground">
              {track?.artist ?? 'Unknown Artist'}
            </p>
          </div>
          <button
            aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={isLiked}
            style={{ touchAction: 'manipulation' }}
            onClick={handleLike}
            className={cn(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full',
              'transition-all duration-150 active:scale-[0.86]',
              isLiked ? 'ms-ctrl' : '',
            )}
          >
            <Heart className={cn('h-[22px] w-[22px] transition-colors duration-200',
              isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} aria-hidden />
          </button>
        </div>

        {/* Прогресс */}
        <div className="mb-2 px-7">
          <Slider value={[progress]} max={100} step={0.1}
                  aria-label="Перемотка"
                  onValueChange={([v]) => audioManager.seek(v)} />
          <div className="mt-2 flex justify-between">
            <span className="font-mono text-[10.5px] text-muted-foreground">{curTime}</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">{totTime}</span>
          </div>
        </div>

        {/* Контролы */}
        <div className="mb-6 flex items-center justify-between px-6">
          <button
            aria-label="Перемешать" aria-pressed={isShuffle}
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('light'); toggleShuffle(); }}
            className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-all duration-100 active:scale-[0.86]',
              isShuffle ? 'text-foreground' : 'text-muted-foreground/55')}
          >
            <Shuffle className="h-[19px] w-[19px]" aria-hidden />
          </button>

          <CtrlBtn label="Предыдущий трек" onClick={() => { haptic('medium'); playPrev(); }}>
            <SkipBack className="h-5 w-5 fill-foreground" aria-hidden />
          </CtrlBtn>

          {/* Главная белая кнопка — выпуклая, объёмная */}
          <button
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('medium'); togglePlay(); }}
            className="ms-depth-btn flex h-[80px] w-[80px] flex-shrink-0 items-center justify-center rounded-full
                       transition-transform duration-100 active:scale-[0.94]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {isPlaying
              ? <Pause className="h-8 w-8 fill-black text-black" aria-hidden />
              : <Play  className="ml-1 h-8 w-8 fill-black text-black" aria-hidden />}
          </button>

          <CtrlBtn label="Следующий трек" onClick={() => { haptic('medium'); playNext(); }}>
            <SkipForward className="h-5 w-5 fill-foreground" aria-hidden />
          </CtrlBtn>

          <button
            aria-label="Повтор" aria-pressed={isRepeat}
            style={{ touchAction: 'manipulation' }}
            onClick={() => { haptic('light'); toggleRepeat(); }}
            className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-all duration-100 active:scale-[0.86]',
              isRepeat ? 'text-foreground' : 'text-muted-foreground/55')}
          >
            <Repeat className="h-[19px] w-[19px]" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
