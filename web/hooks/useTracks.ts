'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTracks } from '@/lib/api';

export function useTracks(genre = 'all') {
  return useQuery({
    queryKey:  ['tracks', genre],
    queryFn:   () => fetchTracks({ genre, limit: 100 }),
    staleTime:       1000 * 60 * 2,   // 2 минуты
    refetchInterval: 1000 * 30,       // фоновый рефетч каждые 30 с → удалённые треки пропадут
    retry:           2,
  });
}
