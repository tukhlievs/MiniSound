import type { Env, TelegramFileResponse } from './types';

// file_path живёт у Telegram ~1 час. Кешируем чуть меньше, чтобы не дёргать
// getFile на каждый Range-запрос при перемотке аудио (и не упираться в лимиты бота).
const FILE_PATH_TTL = 3000; // секунд (~50 мин)

// Возвращает file_path для file_id, кешируя результат getFile в KV.
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

  const res = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  const data = (await res.json()) as TelegramFileResponse;

  if (!data.ok || !data.result) {
    throw new Error(`Telegram getFile error: ${data.description ?? 'unknown'}`);
  }

  const filePath = data.result.file_path;
  await env.PENDING_MEDIA.put(kvKey, filePath, { expirationTtl: FILE_PATH_TTL });
  return filePath;
}

// Полный URL файла на серверах Telegram (СОДЕРЖИТ токен — наружу не отдаётся).
export function buildFileUrl(token: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

// Отправляет сообщение пользователю. reply_markup — произвольная клавиатура
// (например inline_keyboard с web_app кнопкой).
export async function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  replyMarkup?: unknown
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

// Content-Type по расширению file_path.
export function contentTypeForPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'mp3':  return 'audio/mpeg';
    case 'm4a':
    case 'mp4':  return 'audio/mp4';
    case 'oga':
    case 'ogg':  return 'audio/ogg';
    case 'opus': return 'audio/opus';
    case 'flac': return 'audio/flac';
    case 'wav':  return 'audio/wav';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    default:     return 'application/octet-stream';
  }
}

// Парсит caption вида "Title - Artist #genre"
// Примеры: "Blinding Lights - The Weeknd #pop"
//          "Moonlight Sonata #classical"
//          "Track Name"
export function parseCaption(caption: string): {
  title: string;
  artist: string | null;
  genre: string | null;
} {
  let text = caption.trim();

  // Извлекаем первый хэштег как жанр
  const genreMatch = text.match(/#([A-Za-zА-Яа-яёЁ0-9_&-]+)/);
  const genre = genreMatch ? genreMatch[1].toLowerCase() : null;
  text = text.replace(/#[A-Za-zА-Яа-яёЁ0-9_&-]+/g, '').trim();

  // Разделяем "Title - Artist"
  const dashIndex = text.indexOf(' - ');
  if (dashIndex !== -1) {
    return {
      title:  text.slice(0, dashIndex).trim(),
      artist: text.slice(dashIndex + 3).trim() || null,
      genre,
    };
  }

  return { title: text || 'Unknown Track', artist: null, genre };
}
