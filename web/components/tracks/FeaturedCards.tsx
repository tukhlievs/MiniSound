'use client';

import { memo } from 'react';
import { Play } from 'lucide-react';
import { cn, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { Track } from '@/types';

// ── Одна карточка ────────────────────────────────────────────────────────────
const FeaturedCard = memo(function FeaturedCard({
  track, queue, index,
}: { track: Track; queue: Track[]; index: number }) {
  const isActive  = usePlayerStore((s) => selectCurrentTrack(s)?.id === track.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const { haptic } = useTelegram();

  const thumb = track.thumbnail_file_id ? thumbnailUrl(track.thumbnail_file_id) : null;
  const grad  = trackGradient(track.id);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Воспроизвести ${track.title}`}
      style={{ touchAction: 'manipulation', animationDelay: `${index * 35}ms` }}
      onClick={() => { haptic('medium'); playTrack(track, queue); }}
      className="flex-shrink-0 w-[148px] cursor-pointer select-none
                 transition-transform duration-150 active:scale-[0.96]"
    >
      {/* Обложка */}
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-[18px]',
          !thumb && `bg-gradient-to-br ${grad}`,
        )}
        style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.45)' }}
      >
        {thumb && (
          <img src={thumb} alt="" draggable={false} loading="lazy"
               className="h-full w-full object-cover" />
        )}

        {/* Воспроизводится → EQ-анимация */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex items-end gap-[3px]" style={{ height: 20 }}>
              {['eq-1', 'eq-2', 'eq-3'].map((cls, i) => (
                <div key={i}
                  className={cn('w-[3px] rounded-full bg-white origin-bottom', isPlaying ? cls : 'eq-paused', cls)}
                  style={{ height: 18 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Кнопка Play на нажатом (для ясности на тач-интерфейсе) */}
        {!isActive && (
          <div className="absolute bottom-2.5 right-2.5 opacity-0 active:opacity-100 transition-opacity">
            <div className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="h-4 w-4 fill-black text-black ml-0.5" aria-hidden />
            </div>
          </div>
        )}
      </div>

      {/* Название + исполнитель */}
      <p className="mt-2.5 text-[13px] font-semibold leading-tight text-foreground truncate">
        {track.title}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
        {track.artist ?? 'Unknown Artist'}
      </p>
    </div>
  );
});

// ── Секция карточек ──────────────────────────────────────────────────────────
interface FeaturedCardsProps {
  tracks: Track[];
}

export const FeaturedCards = memo(function FeaturedCards({ tracks }: FeaturedCardsProps) {
  // Показываем только если треков достаточно для горизонтального скролла
  if (tracks.length < 3) return null;

  const featured = tracks.slice(0, 12);

  return (
    <section className="mb-6">
      <h2 className="px-4 mb-3 text-[15px] font-semibold text-foreground tracking-tight">
        Недавно добавленные
      </h2>
      <div className="flex gap-3.5 px-4 overflow-x-auto hide-scrollbar pb-1">
        {featured.map((track, i) => (
          <FeaturedCard key={track.id} track={track} queue={tracks} index={i} />
        ))}
      </div>
    </section>
  );
});
