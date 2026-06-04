import type { Track } from './types';

type InsertTrack = Omit<Track, 'id' | 'created_at'>;

// Вставить новый трек (используется сервисным ключом)
export async function insertTrack(
  url: string,
  key: string,
  track: InsertTrack
): Promise<void> {
  const res = await fetch(`${url}/rest/v1/tracks`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      apikey:          key,
      Authorization:   `Bearer ${key}`,
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(track),
  });

  if (!res.ok) {
    const body = await res.text();
    // Дубликат audio_file_id — игнорируем (трек уже есть)
    if (res.status === 409) return;
    throw new Error(`Supabase insert [${res.status}]: ${body}`);
  }
}

// Обновить thumbnail_file_id по audio_file_id (используется сервисным ключом)
export async function updateThumbnail(
  url: string,
  key: string,
  audioFileId: string,
  thumbnailFileId: string
): Promise<void> {
  const res = await fetch(
    `${url}/rest/v1/tracks?audio_file_id=eq.${encodeURIComponent(audioFileId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey:         key,
        Authorization:  `Bearer ${key}`,
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ thumbnail_file_id: thumbnailFileId }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase update [${res.status}]: ${body}`);
  }
}

// Получить список треков (используется анонимным ключом)
export async function getTracks(
  url: string,
  key: string,
  genre?: string,
  limit = 50,
  offset = 0
): Promise<Track[]> {
  const params = new URLSearchParams({
    select: '*',
    order:  'created_at.desc',
    limit:  String(Math.min(limit, 100)),
    offset: String(Math.max(offset, 0)),
  });
  if (genre && genre !== 'all') {
    params.set('genre', `eq.${genre}`);
  }

  const res = await fetch(`${url}/rest/v1/tracks?${params}`, {
    headers: {
      apikey:        key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase query [${res.status}]`);
  }
  return res.json() as Promise<Track[]>;
}
