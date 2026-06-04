import { parseCaption, sendMessage } from './telegram';
import { insertTrack }   from './supabase';
import type { Env, TelegramUpdate, PendingMedia, PhotoSize } from './types';

// Половинки медиагруппы (аудио + фото) ждут друг друга максимум 5 минут
const KV_TTL_SECONDS = 300;

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  // Верификация секрета, который Telegram шлёт в заголовке
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Telegram считает доставку успешной по коду 200. Любую внутреннюю ошибку
  // глотаем (логируем), иначе Telegram будет ретраить один и тот же апдейт.
  try {
    // /start в личке боту → приветствие + кнопка для Mini App
    const msg = update.message;
    if (msg?.chat.type === 'private' && msg.text?.startsWith('/start')) {
      const miniAppUrl = env.MINIAPP_URL ?? new URL(request.url).origin;
      await sendStart(env, msg.chat.id, miniAppUrl);
      return new Response('OK');
    }

    const post = update.channel_post;
    // Обрабатываем только посты из нашего приватного канала
    if (post && String(post.chat.id) === env.CHANNEL_ID) {
      await processPost(env, post);
    }
  } catch (err) {
    console.error('webhook error:', err);
  }

  return new Response('OK');
}

// Приветствие на /start с inline-кнопкой web_app.
// web_app (в отличие от обычной url-кнопки) открывает Mini App ВНУТРИ Telegram —
// её нельзя зажать, чтобы скопировать ссылку или открыть как обычный сайт.
async function sendStart(env: Env, chatId: number, miniAppUrl: string): Promise<void> {
  const text =
    '<b>MiniSound</b>\n\n' +
    'Аудио-стриминг прямо в Telegram — вся твоя музыка в одном приложении.\n\n' +
    'Нажми кнопку ниже, чтобы открыть.';

  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'Открыть MiniSound', web_app: { url: miniAppUrl } }],
    ],
  };

  await sendMessage(env.BOT_TOKEN, chatId, text, replyMarkup);
}

async function processPost(env: Env, post: NonNullable<TelegramUpdate['channel_post']>): Promise<void> {
  const mgId = post.media_group_id;

  // ── Сообщение содержит аудио ──────────────────────────────────────────────
  if (post.audio) {
    const audio   = post.audio;
    const caption = post.caption ?? audio.title ?? audio.file_name ?? 'Unknown Track';
    const { title, artist, genre } = parseCaption(caption);
    const builtInThumb = (audio.thumbnail ?? audio.thumb)?.file_id ?? null;

    if (!mgId) {
      // Одиночное аудио — сохраняем сразу. Обложка из встроенного ID3-thumbnail (если есть).
      await insertTrack(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        title,
        artist,
        audio_file_id:     audio.file_id,
        thumbnail_file_id: builtInThumb,
        duration:          audio.duration,
        genre,
        message_id:        post.message_id,
      });
      return;
    }

    // Аудио — часть альбома (есть отдельное фото-обложка). Прикреплённое фото
    // приоритетнее встроенного thumbnail, поэтому ждём/сопоставляем его.
    const kvKey   = `mg:${mgId}`;
    const pending = await env.PENDING_MEDIA.get<PendingMedia>(kvKey, 'json');

    if (pending?.thumbnailFileId) {
      // Фото уже пришло раньше — сохраняем полный трек
      await insertTrack(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        title,
        artist,
        audio_file_id:     audio.file_id,
        thumbnail_file_id: pending.thumbnailFileId,
        duration:          audio.duration,
        genre,
        message_id:        post.message_id,
      });
      await env.PENDING_MEDIA.delete(kvKey);
    } else {
      // Фото ещё не пришло — буферизуем аудио. Встроенный thumb кладём как
      // запасной вариант на случай, если отдельное фото так и не дойдёт.
      const data: PendingMedia = {
        audioFileId:     audio.file_id,
        title,
        artist,
        genre,
        duration:        audio.duration,
        messageId:       post.message_id,
        thumbnailFileId: builtInThumb ?? undefined,
      };
      await env.PENDING_MEDIA.put(kvKey, JSON.stringify(data), { expirationTtl: KV_TTL_SECONDS });
    }
    return;
  }

  // ── Сообщение содержит фото (обложка трека в медиагруппе) ─────────────────
  if (post.photo?.length && mgId) {
    // Берём фото наибольшего размера из массива
    const largest: PhotoSize = post.photo.reduce((best, cur) =>
      (cur.file_size ?? 0) > (best.file_size ?? 0) ? cur : best
    );

    const kvKey   = `mg:${mgId}`;
    const pending = await env.PENDING_MEDIA.get<PendingMedia>(kvKey, 'json');

    if (pending?.audioFileId && pending.title) {
      // Аудио уже в KV — сохраняем полный трек, прикреплённое фото как обложку
      await insertTrack(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        title:             pending.title,
        artist:            pending.artist ?? null,
        audio_file_id:     pending.audioFileId,
        thumbnail_file_id: largest.file_id,
        duration:          pending.duration ?? null,
        genre:             pending.genre ?? null,
        message_id:        pending.messageId ?? null,
      });
      await env.PENDING_MEDIA.delete(kvKey);
    } else {
      // Фото пришло раньше аудио — буферизуем
      const data: PendingMedia = {
        ...(pending ?? {}),
        thumbnailFileId: largest.file_id,
      };
      await env.PENDING_MEDIA.put(kvKey, JSON.stringify(data), { expirationTtl: KV_TTL_SECONDS });
    }
  }
}
