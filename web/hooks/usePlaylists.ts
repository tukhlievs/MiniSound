'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Track } from '@/types';
import { getHistory, HISTORY_EVENT } from '@/lib/history';
import { generatePlaylists, type Playlist } from '@/lib/playlists';

const LIKED_KEY = 'ms_liked_v2';

function getLiked(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? '[]')); }
  catch { return new Set(); }
}

/**
 * Реактивно пересобирает авто-плейлисты при изменении истории/лайков.
 * История меняется → событие HISTORY_EVENT → пересчёт.
 */
export function usePlaylists(tracks: Track[] | undefined): Playlist[] {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(HISTORY_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(HISTORY_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  return useMemo(
    () => (tracks?.length ? generatePlaylists(tracks, getHistory(), getLiked()) : []),
    [tracks, version]
  );
}
