import type { Track } from './types';

type InsertTrack = Omit<Track, 'id' | 'created_at'>;

export async function insertTrack(url: string, key: string, track: InsertTrack): Promise<void> {
  const res = await fetch(`${url}/rest/v1/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    body: JSON.stringify(track),
  });
  if (!res.ok) {
    if (res.status === 409) return;
    throw new Error(`Supabase insert [${res.status}]: ${await res.text()}`);
  }
}

export async function updateThumbnail(url: string, key: string, audioFileId: string, thumbnailFileId: string): Promise<void> {
  const res = await fetch(`${url}/rest/v1/tracks?audio_file_id=eq.${encodeURIComponent(audioFileId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    body: JSON.stringify({ thumbnail_file_id: thumbnailFileId }),
  });
  if (!res.ok) throw new Error(`Supabase update [${res.status}]: ${await res.text()}`);
}

export async function updateThumbnailByTitlePrefix(url: string, key: string, prefix: string, thumbnailFileId: string): Promise<boolean> {
  if (!prefix.trim()) return false;
  const filter = encodeURIComponent(`${prefix.trim()}*`);
  const res = await fetch(`${url}/rest/v1/tracks?title=ilike.${filter}&thumbnail_file_id=is.null`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    body: JSON.stringify({ thumbnail_file_id: thumbnailFileId }),
  });
  return res.ok;
}

export async function getTracks(url: string, key: string, genre?: string, limit = 50, offset = 0): Promise<Track[]> {
  const p = new URLSearchParams({ select: '*', order: 'created_at.desc', limit: String(Math.min(limit, 100)), offset: String(Math.max(offset, 0)) });
  if (genre && genre !== 'all') p.set('genre', `eq.${genre}`);
  const res = await fetch(`${url}/rest/v1/tracks?${p}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase query [${res.status}]`);
  return res.json() as Promise<Track[]>;
}

export async function countTracks(url: string, key: string): Promise<number> {
  const res = await fetch(`${url}/rest/v1/tracks?select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
  });
  const range = res.headers.get('Content-Range');
  if (!range) return 0;
  const total = parseInt(range.split('/')[1], 10);
  return Number.isFinite(total) ? total : 0;
}
