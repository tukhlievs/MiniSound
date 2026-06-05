import {
  parseCaption,
  sendMessage,
  deleteWebhook,
  setWebhook,
  getWebhookInfo,
  getUpdates,
} from './telegram';
import { insertTrack } from './supabase';
import type { Env, TelegramUpdate, PendingMedia, PhotoSize } from './types';

const KV_TTL_SECONDS = 300;

// ── Точка входа ──────────────────────────────────────────────────────────────

export async function handleWebhook(
  request: Request,
  env:     Env,
  ctx:     ExecutionContext
): Promise<Response> {
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

  try {
    const msg = update.message;
    if (msg?.chat.type === 'private') {
      const webhookUrl = `${new URL(request.url).origin}/webhook`;

      if (msg.text?.startsWith('/start')) {
        const miniAppUrl = env.MINIAPP_URL ?? new URL(request.url).origin;
        await sendStart(env, msg.chat.id, miniAppUrl);
        return new Response('OK');
      }

      if (msg.text?.startsWith('/sync')) {
        // Проверяем права администратора (если ADMIN_ID задан)
        if (env.ADMIN_ID && String(msg.from?.id) !== env.ADMIN_ID) {
          await sendMessage(env.BOT_TOKEN, msg.chat.id, '⛔ Нет доступа.');
          return new Response('OK');
        }

        // Отправляем ответ немедленно — синхронизация идёт в фоне
        await sendMessage(env.BOT_TOKEN, msg.chat.id, '🔄 Синхронизация запущена…\nЭто займёт несколько секунд.');
        ctx.waitUntil(runSync(env, msg.chat.id, webhookUrl));
        return new Response('OK');
      }
    }

    const post = update.channel_post;
    if (post && String(post.chat.id) === env.CHANNEL_ID) {
      await processPost(env, post);
    }
  } catch (err) {
    console.error('webhook error:', err);
  }

  return new Response('OK');
}

// ── Проверка и автовосстановление вебхука (вызывается из cron) ───────────────

export async function ensureWebhookActive(env: Env, expectedUrl?: string): Promise<void> {
  try {
    const url  = expectedUrl ?? `${env.MINIAPP_URL ?? 'https://minisound.abutukhliev.workers.dev'}/webhook`;
    const info = await getWebhookInfo(env.BOT_TOKEN);

    if (info.url !== url) {
      console.log(`[cron] webhook URL wrong (${info.url || 'empty'}), re-registering → ${url}`);
      await setWebhook(env.BOT_TOKEN, url, env.WEBHOOK_SECRET || undefined);
      console.log('[cron] webhook restored');
    }
  } catch (err) {
    console.error('[cron] ensureWebhookActive error:', err);
  }
}

// ── /sync — забрать пропущенные апдейты ──────────────────────────────────────

async function runSync(env: Env, chatId: number, webhookUrl: string): Promise<void> {
  let processed = 0;
  try {
    // 1. Снимаем вебхук (не удаляя накопленные апдейты)
    await deleteWebhook(env.BOT_TOKEN);

    let offset: number | undefined;

    // 2. Забираем апдейты порциями, пока они есть
    while (true) {
      const updates = await getUpdates(env.BOT_TOKEN, offset, 100);
      if (!updates.length) break;

      for (const upd of updates) {
        if (upd.channel_post && String(upd.channel_post.chat.id) === env.CHANNEL_ID) {
          try {
            await processPost(env, upd.channel_post);
            processed++;
          } catch (err) {
            console.error('sync: processPost error', err);
          }
        }
        offset = upd.update_id + 1;
      }

      if (updates.length < 100) break; // последняя порция
    }

    // 3. Восстанавливаем вебхук
    await setWebhook(env.BOT_TOKEN, webhookUrl, env.WEBHOOK_SECRET || undefined);

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      `✅ Синхронизация завершена.\nОбработано постов канала: <b>${processed}</b>`
    );
  } catch (err) {
    // Обязательно восстанавливаем вебхук даже при ошибке
    await setWebhook(env.BOT_TOKEN, webhookUrl, env.WEBHOOK_SECRET || undefined).catch(() => {});
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Ошибка синхронизации: ${String(err)}`).catch(() => {});
  }
}

// ── /start ───────────────────────────────────────────────────────────────────

async function sendStart(env: Env, chatId: number, miniAppUrl: string): Promise<void> {
  const text =
    '<b>MiniSound</b>\n\n' +
    'Аудио-стриминг прямо в Telegram — вся твоя музыка в одном приложении.\n\n' +
    'Нажми кнопку ниже, чтобы открыть.';

  await sendMessage(env.BOT_TOKEN, chatId, text, {
    inline_keyboard: [
      [{ text: '▶ Открыть MiniSound', web_app: { url: miniAppUrl } }],
    ],
  });
}

// ── Обработка поста канала ───────────────────────────────────────────────────

async function processPost(env: Env, post: NonNullable<TelegramUpdate['channel_post']>): Promise<void> {
  const mgId = post.media_group_id;

  if (post.audio) {
    const audio   = post.audio;
    const caption = post.caption ?? audio.title ?? audio.file_name ?? 'Unknown Track';
    const { title, artist, genre } = parseCaption(caption);
    // Встроенный ID3-thumbnail НЕ используем — берём только явно прикреплённое фото

    if (!mgId) {
      await insertTrack(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        title,
        artist,
        audio_file_id:     audio.file_id,
        thumbnail_file_id: null,
        duration:          audio.duration,
        genre,
        message_id:        post.message_id,
      });
      return;
    }

    const kvKey   = `mg:${mgId}`;
    const pending = await env.PENDING_MEDIA.get<PendingMedia>(kvKey, 'json');

    if (pending?.thumbnailFileId) {
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
      const data: PendingMedia = {
        audioFileId: audio.file_id,
        title,
        artist,
        genre,
        duration:  audio.duration,
        messageId: post.message_id,
      };
      await env.PENDING_MEDIA.put(kvKey, JSON.stringify(data), { expirationTtl: KV_TTL_SECONDS });
    }
    return;
  }

  if (post.photo?.length && mgId) {
    const largest: PhotoSize = post.photo.reduce((best, cur) =>
      (cur.file_size ?? 0) > (best.file_size ?? 0) ? cur : best
    );

    const kvKey   = `mg:${mgId}`;
    const pending = await env.PENDING_MEDIA.get<PendingMedia>(kvKey, 'json');

    if (pending?.audioFileId && pending.title) {
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
      const data: PendingMedia = { ...(pending ?? {}), thumbnailFileId: largest.file_id };
      await env.PENDING_MEDIA.put(kvKey, JSON.stringify(data), { expirationTtl: KV_TTL_SECONDS });
    }
  }
}
