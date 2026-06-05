'use client';

import { useMemo } from 'react';
import { Music2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FeaturedCards } from './FeaturedCards';
import { TrackCard }     from './TrackCard';
import type { Track } from '@/types';

interface TrackListProps {
  tracks:  Track[] | undefined;
  loading: boolean;
  error:   Error | null;
  query:   string;
  genre:   string;
}

function TrackSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl">
      <Skeleton className="h-11 w-11 flex-shrink-0 rounded-[11px] bg-white/[0.06]" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-[11px] w-3/4 rounded-full bg-white/[0.06]" />
        <Skeleton className="h-[9px]  w-1/2 rounded-full bg-white/[0.04]" />
      </div>
      <Skeleton className="h-[9px] w-8 flex-shrink-0 rounded-full bg-white/[0.04]" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
        <Music2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-[15px] font-semibold text-foreground">{message}</p>
    </div>
  );
}

export function TrackList({ tracks, loading, error, query, genre }: TrackListProps) {
  const filtered = useMemo(() => {
    if (!tracks) return [];
    const q = query.toLowerCase();
    return tracks.filter((t) => {
      const matchGenre  = genre === 'all' || t.genre === genre;
      const matchSearch = !q
        || t.title.toLowerCase().includes(q)
        || (t.artist ?? '').toLowerCase().includes(q);
      return matchGenre && matchSearch;
    });
  }, [tracks, query, genre]);

  if (loading) {
    return (
      <div>
        {/* Скелетон для карточек */}
        <div className="mb-6">
          <Skeleton className="mx-4 mb-3 h-[15px] w-36 rounded-full bg-white/[0.06]" />
          <div className="flex gap-3.5 px-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex-shrink-0 w-[148px]">
                <Skeleton className="aspect-square w-full rounded-[18px] bg-white/[0.06]" />
                <Skeleton className="mt-2.5 h-[11px] w-3/4 rounded-full bg-white/[0.05]" />
                <Skeleton className="mt-1.5 h-[9px]  w-1/2 rounded-full bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
        {/* Скелетон для списка */}
        <div className="space-y-0.5">
          {Array.from({ length: 8 }, (_, i) => <TrackSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) return <EmptyState message="Не удалось загрузить треки" />;
  if (!filtered.length) {
    return <EmptyState message={query ? 'Ничего не найдено' : 'Треков пока нет'} />;
  }

  const isFiltered = !!query || genre !== 'all';

  return (
    <div>
      {/* Горизонтальные карточки — только без фильтров */}
      {!isFiltered && <FeaturedCards tracks={filtered} />}

      {/* Заголовок секции списка */}
      <h2 className="px-4 mb-2 text-[15px] font-semibold text-foreground tracking-tight">
        {isFiltered ? `Результаты (${filtered.length})` : 'Все треки'}
      </h2>

      {/* Список строк */}
      <div className="space-y-0.5 pb-4">
        {filtered.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            queue={filtered}
            index={i}
            style={{
              animationName:     'fade-up',
              animationDuration: '0.22s',
              animationFillMode: 'forwards',
              animationDelay:    `${i * 22}ms`,
              opacity:           0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
