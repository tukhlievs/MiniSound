'use client';

import { cn, formatDuration, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { Track } from '@/types';

interface TrackCardProps {
  track: Track;
  queue: Track[];
  style?: React.CSSProperties;
}

function EqOverlay({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[13px] bg-black/35">
      <div className="flex items-end gap-[3px]" style={{ height: 18 }}>
        {['eq-1', 'eq-2', 'eq-3'].map((cls, i) => (
          <div
            key={i}
            className={cn('w-[3px] rounded-full bg-white origin-bottom', playing ? cls : 'eq-paused', cls)}
            style={{ height: 16 }}
          />
        ))}
      </div>
    </div>
  );
}

export function TrackCard({ track, queue, style }: TrackCardProps) {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const playTrack    = usePlayerStore((s) => s.playTrack);
  const { haptic }   = useTelegram();

  const isActive = currentTrack?.id === track.id;

  return (
    <div
      role="button"
      tabIndex={0}
      style={{ ...style, touchAction: 'manipulation' }}
      onClick={() => { haptic('medium'); playTrack(track, queue); }}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-2xl',
        'cursor-pointer transition-all duration-150 active:scale-[0.98] active:opacity-75',
        isActive
          ? 'bg-primary/[0.08]'
          : 'bg-card hover:bg-black/[0.02]',
        'shadow-card',
      )}
    >
      {/* Обложка */}
      <div
        className={cn(
          'relative h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-[12px]',
          !track.thumbnail_file_id && `bg-gradient-to-br ${trackGradient(track.id)}`,
        )}
      >
        {track.thumbnail_file_id && (
          <img
            src={thumbnailUrl(track.thumbnail_file_id)}
            alt={track.title}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
        )}
        {isActive && <EqOverlay playing={isPlaying} />}
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'truncate text-[14px] font-semibold leading-snug',
          isActive ? 'text-primary' : 'text-foreground',
        )}>
          {track.title}
        </p>
        <p className="mt-[2px] truncate text-[12px] text-muted-foreground">
          {track.artist ?? 'Unknown Artist'}
        </p>
      </div>

      {/* Длительность */}
      {track.duration != null && (
        <span className="flex-shrink-0 font-mono text-[12px] text-muted-foreground">
          {formatDuration(track.duration)}
        </span>
      )}
    </div>
  );
}
