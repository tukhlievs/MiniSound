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
// Берём только первую строку — остальные могут содержать служебную информацию (от бота).
export function parseCaption(caption: string): { title: string; artist: string | null; genre: string | null } {
  // Берём только первую строку caption (bot posts may append metadata on next lines)
  let text = caption.trim().split('\n')[0].trim();
  // Убираем расширения аудиофайлов из названий (example-funk.mp3 → example-funk)
  text = text.replace(/\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|aiff?)$/i, '').trim();
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

// ── Дополнительные методы Bot API ────────────────────────────────────────────

export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  });
}

export async function sendPhoto(token: string, chatId: number | string, photoFileId: string, caption?: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoFileId, parse_mode: 'HTML', ...(caption ? { caption } : {}) }),
  });
}

// Копирует сообщение в другой чат с опциональным новым caption.
// Возвращает message_id нового сообщения.
export async function copyMessage(
  token: string, toChatId: number | string,
  fromChatId: number | string, messageId: number,
  caption?: string
): Promise<number> {
  const res = await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:      toChatId,
      from_chat_id: fromChatId,
      message_id:   messageId,
      parse_mode:   'HTML',
      ...(caption !== undefined ? { caption } : {}),
    }),
  });
  const data = await res.json() as { ok: boolean; result?: { message_id: number } };
  return data.result?.message_id ?? 0;
}

// Проверяет, существует ли сообщение в канале.
// Форвардит его в чат adminChatId, проверяет результат, сразу удаляет форвард.
// Используется для очистки треков, чьи посты были удалены из канала.
export async function checkMessageExists(
  token: string, channelId: string, adminChatId: string, messageId: number
): Promise<boolean> {
  const fwd = await fetch(`https://api.telegram.org/bot${token}/forwardMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: adminChatId, from_chat_id: channelId, message_id: messageId }),
  });
  const data = await fwd.json() as { ok: boolean; result?: { message_id: number } };

  if (data.ok && data.result) {
    // Удаляем сразу — чтобы не спамить чат администратора
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChatId, message_id: data.result.message_id }),
    });
    return true;
  }
  return false;
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
      allowed_updates: ['message', 'channel_post', 'callback_query'],
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
