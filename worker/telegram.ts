import type { Env, TelegramFileResponse, TelegramUpdate } from './types';

// file_path живёт у Telegram ~1 час. Кешируем чуть меньше.
const FILE_PATH_TTL = 3000; // ~50 мин

// Возвращает file_path для file_id, кешируя результат в KV.
export async function resolveFilePath(
  env: Env,
  fileId: string,
  forceRefresh = false
): Promise<string> {
  const kvKey = `fp:${fileId}`;
  if (!forceRefresh) {
    const cached = await env.PENDING_MEDIA.get(kvKey);
    if (cached) return cached;
  }
  const res  = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = (await res.json()) as TelegramFileResponse;
  if (!data.ok || !data.result) throw new Error(`Telegram getFile error: ${data.description ?? 'unknown'}`);
  const filePath = data.result.file_path;
  await env.PENDING_MEDIA.put(kvKey, filePath, { expirationTtl: FILE_PATH_TTL });
  return filePath;
}

// Полный URL файла (СОДЕРЖИТ токен — наружу не отдаётся).
export function buildFileUrl(token: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

// Content-Type по расширению file_path.
export function contentTypeForPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'mp3':               return 'audio/mpeg';
    case 'm4a': case 'mp4':  return 'audio/mp4';
    case 'oga': case 'ogg':  return 'audio/ogg';
    case 'opus':              return 'audio/opus';
    case 'flac':              return 'audio/flac';
    case 'wav':               return 'audio/wav';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png':               return 'image/png';
    case 'webp':              return 'image/webp';
    default:                  return 'application/octet-stream';
  }
}

// Парсит caption вида "Title - Artist #genre"
export function parseCaption(caption: string): { title: string; artist: string | null; genre: string | null } {
  let text = caption.trim();
  const genreMatch = text.match(/#([A-Za-zА-Яа-яёЁ0-9_&-]+)/);
  const genre = genreMatch ? genreMatch[1].toLowerCase() : null;
  text = text.replace(/#[A-Za-zА-Яа-яёЁ0-9_&-]+/g, '').trim();
  const dash = text.indexOf(' - ');
  if (dash !== -1) return { title: text.slice(0, dash).trim(), artist: text.slice(dash + 3).trim() || null, genre };
  return { title: text || 'Unknown Track', artist: null, genre };
}

// Отправляет сообщение пользователю с опциональной inline-клавиатурой.
export async function sendMessage(
  token: string, chatId: number | string, text: string, replyMarkup?: unknown
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:                  chatId,
      text,
      parse_mode:               'HTML',
      disable_web_page_preview: true,
      reply_markup:             replyMarkup,
    }),
  });
}

// ── Вебхук-управление ────────────────────────────────────────────────────────

export interface WebhookInfo {
  url:                  string;
  pending_update_count: number;
}

export async function getWebhookInfo(token: string): Promise<WebhookInfo> {
  const res  = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await res.json() as { ok: boolean; result: WebhookInfo };
  if (!data.ok) throw new Error('getWebhookInfo failed');
  return data.result;
}

export async function setWebhook(token: string, url: string, secretToken?: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      allowed_updates: ['message', 'channel_post'],
      ...(secretToken ? { secret_token: secretToken } : {}),
    }),
  });
}

// drop_pending_updates = false → Telegram сохраняет апдейты для getUpdates
export async function deleteWebhook(token: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
}

// Возвращает порцию апдейтов начиная с offset.
export async function getUpdates(
  token:   string,
  offset?: number,
  limit  = 100
): Promise<TelegramUpdate[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (offset !== undefined) params.set('offset', String(offset));
  const res  = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${params}`);
  const data = await res.json() as { ok: boolean; result: TelegramUpdate[] };
  if (!data.ok) throw new Error('getUpdates failed');
  return data.result;
}
