'use client';

import { cn, formatDuration, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { Track } from '@/types';

interface TrackCardProps {
  track: Track;
  queue: Track[];
  index: number;
  style?: React.CSSProperties;
}

/* Анимированный эквалайзер (показывается поверх обложки активного трека) */
function EqBars({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[14px]">
      <div className="flex items-end gap-[3px] h-5">
        {[
          playing ? 'animate-eq1' : '',
          playing ? 'animate-eq2' : '',
          playing ? 'animate-eq3' : '',
        ].map((anim, i) => (
          <div
            key={i}
            className={cn(
              'w-[3px] rounded-full bg-primary origin-bottom',
              anim || 'h-1.5'
            )}
            style={{ height: playing ? undefined : '6px' }}
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

  const handleTap = () => {
    haptic('medium');
    playTrack(track, queue);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl',
        'transition-all duration-150 active:scale-[0.97] active:opacity-70',
        'cursor-pointer',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
      )}
      style={style}
      onClick={handleTap}
    >
      {/* Обложка */}
      <div className={cn(
        'relative w-14 h-14 flex-shrink-0 rounded-[14px] overflow-hidden',
        !track.thumbnail_file_id && `bg-gradient-to-br ${trackGradient(track.id)}`
      )}>
        {track.thumbnail_file_id && (
          <img
            src={thumbnailUrl(track.thumbnail_file_id)}
            alt={track.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
        {isActive && <EqBars playing={isPlaying} />}
      </div>

      {/* Информация */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[13px] font-semibold truncate',
          isActive ? 'text-primary' : 'text-white'
        )}>
          {track.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {track.artist ?? 'Unknown Artist'}
        </p>
      </div>

      {/* Длительность */}
      {track.duration && (
        <span className="text-[11px] text-muted-foreground flex-shrink-0">
          {formatDuration(track.duration)}
        </span>
      )}
    </div>
  );
}
