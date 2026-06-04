import type { Track } from '@/types';

// В Mini App — относительные пути, если фронт на том же домене что и Worker.
// На Vercel — задаётся через NEXT_PUBLIC_API_URL.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchTracks(params: {
  genre?: string;
  limit?: number;
  offset?: number;
}): Promise<Track[]> {
  const q = new URLSearchParams();
  if (params.genre && params.genre !== 'all') q.set('genre', params.genre);
  q.set('limit',  String(params.limit  ?? 100));
  q.set('offset', String(params.offset ?? 0));

  const res = await fetch(`${BASE}/api/tracks?${q}`);
  if (!res.ok) throw new Error(`tracks fetch failed: ${res.status}`);
  return res.json() as Promise<Track[]>;
}

export function streamUrl(audioFileId: string): string {
  return `${BASE}/api/stream/${encodeURIComponent(audioFileId)}`;
}

export function thumbnailUrl(thumbnailFileId: string): string {
  return `${BASE}/api/thumbnail/${encodeURIComponent(thumbnailFileId)}`;
}
