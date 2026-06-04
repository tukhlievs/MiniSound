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

function SkeletonList() {
  return (
    <div className="px-4 space-y-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03]">
          <Skeleton className="w-14 h-14 rounded-[14px] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4 rounded-full" />
            <Skeleton className="h-2.5 w-1/2 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-10 rounded-full" />
        </div>
      ))}
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

  if (loading) return <SkeletonList />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Music2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold">Не удалось загрузить треки</p>
        <p className="text-sm text-muted-foreground mt-1">Проверь подключение к интернету</p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Music2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold">Треков пока нет</p>
        <p className="text-sm text-muted-foreground mt-1">
          {query ? 'Попробуй другой запрос' : 'Контент появится совсем скоро'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-2 pb-4">
      {filtered.map((track, i) => (
        <TrackCard
          key={track.id}
          track={track}
          queue={filtered}
          index={i}
          style={{ animationDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  );
}
