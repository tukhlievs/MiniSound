'use client';

import { useMemo } from 'react';
import { Music2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackCard } from './TrackCard';
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
    <div className="flex items-center gap-3 rounded-2xl bg-card shadow-card px-4 py-2.5">
      <Skeleton className="h-[52px] w-[52px] flex-shrink-0 rounded-[12px] bg-black/6" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-[11px] w-3/4 rounded-full bg-black/6" />
        <Skeleton className="h-[9px]  w-1/2 rounded-full bg-black/4" />
      </div>
      <Skeleton className="h-[9px] w-8 flex-shrink-0 rounded-full bg-black/4" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5">
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
      <div className="space-y-2 px-4">
        {Array.from({ length: 7 }, (_, i) => <TrackSkeleton key={i} />)}
      </div>
    );
  }

  if (error) return <EmptyState message="Не удалось загрузить треки" />;
  if (!filtered.length) {
    return <EmptyState message={query ? 'Ничего не найдено' : 'Треков пока нет'} />;
  }

  return (
    <div className="space-y-1.5 px-4 pb-4">
      {filtered.map((track, i) => (
        <TrackCard
          key={track.id}
          track={track}
          queue={filtered}
          style={{
            animationName:     'fade-up',
            animationDuration: '0.25s',
            animationFillMode: 'forwards',
            animationDelay:    `${i * 25}ms`,
            opacity:           0,
          }}
        />
      ))}
    </div>
  );
}
