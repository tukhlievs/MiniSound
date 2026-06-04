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

/** Три анимированных полоски эквалайзера поверх обложки */
function EqOverlay({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/45">
      <div className="flex items-end gap-[3px]" style={{ height: 18 }}>
        {['eq-1', 'eq-2', 'eq-3'].map((cls, i) => (
          <div
            key={i}
            className={cn(
              'w-[3px] rounded-full bg-primary origin-bottom',
              playing ? cls : 'eq-paused',
              cls
            )}
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
        'relative flex items-center gap-3 px-4 py-3 rounded-2xl',
        'cursor-pointer select-none',
        'transition-all duration-150 active:scale-[0.97] active:opacity-70',
        isActive
          ? 'bg-primary/[0.10]'
          : 'bg-white/[0.03] hover:bg-white/[0.06]',
      )}
    >
      {/* Левый акцентный штрих для активного трека */}
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary" />
      )}

      {/* Обложка */}
      <div
        className={cn(
          'relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[14px]',
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
        <p
          className={cn(
            'truncate text-[13px] font-semibold leading-snug',
            isActive ? 'text-primary' : 'text-foreground',
          )}
        >
          {track.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {track.artist ?? 'Unknown Artist'}
        </p>
      </div>

      {/* Длительность в моноширинном шрифте */}
      {track.duration != null && (
        <span className="flex-shrink-0 font-mono text-[11px] text-muted-foreground">
          {formatDuration(track.duration)}
        </span>
      )}
    </div>
  );
}
