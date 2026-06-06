import type { Track } from '@/types';
import type { HistoryMap } from './history';

export interface Playlist {
  id:       string;
  title:    string;
  subtitle: string;
  tracks:   Track[];
}

const GENRE_LABELS: Record<string, string> = {
  pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Electronic',
  classical: 'Classical', jazz: 'Jazz', lofi: 'Lo-Fi', rnb: 'R&B',
};

function label(genre: string): string {
  return GENRE_LABELS[genre] ?? genre.charAt(0).toUpperCase() + genre.slice(1);
}

function plural(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'трек';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'трека';
  return 'треков';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Генерирует авто-плейлисты из истории прослушиваний + библиотеки + лайков.
 * Возвращает только плейлисты, в которых достаточно треков.
 */
export function generatePlaylists(
  all: Track[], history: HistoryMap, liked: Set<string>
): Playlist[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  const playlists: Playlist[] = [];

  // Записи истории, для которых трек ещё существует в библиотеке
  const entries = Object.entries(history)
    .filter(([id]) => byId.has(id))
    .map(([id, e]) => ({ track: byId.get(id)!, ...e }));

  // 1. Любимые (из лайков)
  const likedTracks = all.filter((t) => liked.has(t.id));
  if (likedTracks.length >= 1) {
    playlists.push({
      id: 'liked', title: 'Любимые',
      subtitle: `${likedTracks.length} ${plural(likedTracks.length)}`,
      tracks: likedTracks,
    });
  }

  // 2. На повторе — count >= 2, по убыванию
  const onRepeat = entries.filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count).map((e) => e.track);
  if (onRepeat.length >= 3) {
    playlists.push({
      id: 'on-repeat', title: 'На повторе',
      subtitle: 'Треки, к которым ты возвращаешься',
      tracks: onRepeat.slice(0, 25),
    });
  }

  // 3. Недавно слушал
  const recent = [...entries].sort((a, b) => b.lastTs - a.lastTs).map((e) => e.track);
  if (recent.length >= 4) {
    playlists.push({
      id: 'recent', title: 'Недавно слушал',
      subtitle: 'Снова в эфире',
      tracks: recent.slice(0, 25),
    });
  }

  // Топ-жанры по сумме прослушиваний
  const genreCount: Record<string, number> = {};
  for (const e of entries) if (e.genre) genreCount[e.genre] = (genreCount[e.genre] ?? 0) + e.count;
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).map(([g]) => g);

  // 4. Твой микс по топовому жанру
  if (topGenres[0]) {
    const g   = topGenres[0];
    const mix = shuffle(all.filter((t) => t.genre === g));
    if (mix.length >= 4) {
      playlists.push({
        id: `mix-${g}`, title: `Твой микс: ${label(g)}`,
        subtitle: 'Подобрано по прослушиваниям',
        tracks: mix.slice(0, 25),
      });
    }
  }

  // 5. Открытия — треки в любимых жанрах, которые ты ещё не слушал
  if (topGenres.length) {
    const playedIds = new Set(entries.map((e) => e.track.id));
    const top3      = new Set(topGenres.slice(0, 3));
    const discover  = shuffle(
      all.filter((t) => t.genre && top3.has(t.genre) && !playedIds.has(t.id))
    );
    if (discover.length >= 4) {
      playlists.push({
        id: 'discover', title: 'Открытия для тебя',
        subtitle: 'Новое в любимых жанрах',
        tracks: discover.slice(0, 25),
      });
    }
  }

  return playlists;
}
