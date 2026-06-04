'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTracks } from '@/lib/api';

export function useTracks(genre = 'all') {
  return useQuery({
    queryKey:  ['tracks', genre],
    queryFn:   () => fetchTracks({ genre, limit: 100 }),
    staleTime: 1000 * 60 * 5,  // 5 минут — треки не обновляются часто
    retry:     2,
  });
}
