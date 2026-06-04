'use client';

import { ChevronUp, SkipBack, SkipForward, Pause, Play } from 'lucide-react';
import { cn, formatDuration, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import { Button } from '@/components/ui/button';

export function MiniPlayer() {
  const track     = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress  = usePlayerStore((s) => s.progress);
  const duration  = usePlayerStore((s) => s.duration);

  const { togglePlay, playNext, playPrev, openFullPlayer } = usePlayerStore();
  const { haptic } = useTelegram();

  if (!track) return null;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    togglePlay();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    playNext();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    playPrev();
  };

  return (
    <div
      className="fixed left-3 right-3 z-50 animate-slide-up"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
    >
      {/* Основная плашка */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl glass cursor-pointer"
        onClick={() => { haptic('light'); openFullPlayer(); }}
      >
        {/* Обложка */}
        <div className={cn(
          'relative w-11 h-11 flex-shrink-0 rounded-[12px] overflow-hidden',
          !track.thumbnail_file_id && `bg-gradient-to-br ${trackGradient(track.id)}`
        )}>
          {track.thumbnail_file_id && (
            <img
              src={thumbnailUrl(track.thumbnail_file_id)}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Название + исполнитель */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate text-white">{track.title}</p>
          <p className="text-[11px] truncate text-muted-foreground mt-0.5">
            {track.artist ?? 'Unknown Artist'}
          </p>
        </div>

        {/* Prev */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-white"
          onClick={handlePrev}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play / Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-9 w-9 flex-shrink-0 rounded-full bg-primary shadow-lg shadow-primary/30"
          onClick={handlePlay}
        >
          {isPlaying
            ? <Pause  className="h-3.5 w-3.5 fill-white text-white" />
            : <Play   className="h-3.5 w-3.5 fill-white text-white" />
          }
        </Button>

        {/* Next */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-white"
          onClick={handleNext}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Полоска прогресса */}
      <div className="mx-3 mt-1 h-[2px] rounded-full overflow-hidden bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Время */}
      <div className="mx-3 mt-0.5 flex justify-between">
        <span className="text-[9px] text-muted-foreground/60">
          {formatDuration(Math.floor((progress / 100) * duration))}
        </span>
        <span className="text-[9px] text-muted-foreground/60">
          {formatDuration(Math.floor(duration))}
        </span>
      </div>
    </div>
  );
}
