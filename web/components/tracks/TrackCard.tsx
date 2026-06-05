'use client';

import { memo } from 'react';
import { cn, formatDuration, trackGradient, cleanTrackTitle } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { Track } from '@/types';

interface TrackCardProps {
  track: Track;
  queue: Track[];
  index?: number;
  style?: React.CSSProperties;
}

/** EQ-оверлей поверх обложки активного трека */
function EqOverlay({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[11px]" aria-hidden>
      <div className="flex items-end gap-[3px]" style={{ height: 16 }}>
        {['eq-1', 'eq-2', 'eq-3'].map((cls, i) => (
          <div key={i}
            className={cn('w-[3px] rounded-full bg-white origin-bottom', playing ? cls : 'eq-paused', cls)}
            style={{ height: 14 }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Строка трека в стиле Feishin: компактная, с обложкой, комбинированной колонкой
 * title/artist и длительностью справа. memo + производные булевы подписки.
 */
export const TrackCard = memo(function TrackCard({ track, queue, index = 0, style }: TrackCardProps) {
  const isActive        = usePlayerStore((s) => selectCurrentTrack(s)?.id === track.id);
  const isActivePlaying = usePlayerStore((s) => selectCurrentTrack(s)?.id === track.id && s.isPlaying);
  const playTrack       = usePlayerStore((s) => s.playTrack);
  const { haptic }      = useTelegram();

  const thumb = track.thumbnail_file_id ? thumbnailUrl(track.thumbnail_file_id) : null;
  const grad  = trackGradient(track.id);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${cleanTrackTitle(track.title)}${track.artist ? ` — ${track.artist}` : ''}`}
      aria-current={isActive ? 'true' : undefined}
      style={{ ...style, touchAction: 'manipulation' }}
      onClick={() => { haptic('medium'); playTrack(track, queue); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('medium'); playTrack(track, queue); }
      }}
      className={cn(
        'cv-auto flex items-center gap-3 px-4 py-2 rounded-xl',
        'cursor-pointer select-none',
        'transition-all duration-100 active:scale-[0.985] active:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
      )}
    >
      {/* Обложка 44×44 */}
      <div className={cn(
        'relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-[11px]',
        !thumb && `bg-gradient-to-br ${grad}`,
      )}>
        {thumb && (
          <img src={thumb} alt="" loading="lazy" draggable={false}
               className="h-full w-full object-cover" />
        )}
        {isActive && <EqOverlay playing={isActivePlaying} />}
      </div>

      {/* Колонка: название + исполнитель */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'truncate text-[13.5px] font-medium leading-snug',
          isActive ? 'text-foreground brightness-150' : 'text-foreground',
        )}>
          {cleanTrackTitle(track.title)}
        </p>
        <p className="mt-[1px] truncate text-[11.5px] text-muted-foreground">
          {track.artist ?? 'Unknown Artist'}
        </p>
      </div>

      {/* Длительность — моноширинный шрифт как в Feishin */}
      {track.duration != null && (
        <span className="flex-shrink-0 font-mono text-[11.5px] text-muted-foreground">
          {formatDuration(track.duration)}
        </span>
      )}
    </div>
  );
});
