import {
  parseCaption, sendMessage, sendPhoto, answerCallbackQuery, copyMessage,
  deleteWebhook, setWebhook, getWebhookInfo, getUpdates,
} from './telegram';
import { insertTrack, countTracks, updateThumbnailByTitlePrefix } from './supabase';
import type { Env, TelegramUpdate, PendingMedia, PhotoSize, AdminConvState, CallbackQuery, Message } from './types';

const KV_MEDIA_TTL = 300;    // 5 мин — ожидание второй половины медиагруппы
const KV_CONV_TTL  = 600;    // 10 мин — шаг admin-диалога

// ── Точка входа ──────────────────────────────────────────────────────────────

export async function handleWebhook(
  request: Request, env: Env, ctx: ExecutionContext
): Promise<Response> {
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  let update: TelegramUpdate;
  try { update = (await request.json()) as TelegramUpdate; }
  catch { return new Response('Bad Request', { status: 400 }); }

  try {
    const webhookUrl = `${new URL(request.url).origin}/webhook`;

    // ── Callback query (нажатие inline-кнопки) ────────────────────────
    if (update.callback_query) {
      await handleCallbackQuery(env, update.callback_query);
      return new Response('OK');
    }

    // ── Личное сообщение (команды + admin-диалог) ──────────────────────
    const msg = update.message;
    if (msg?.chat.type === 'private') {
      const isAdmin = !!env.ADMIN_ID && String(msg.from?.id) === env.ADMIN_ID;

      // Продолжаем активный admin-диалог
      if (isAdmin) {
        const convKey  = `admin_conv:${msg.chat.id}`;
        const convState = await env.PENDING_MEDIA.get<AdminConvState>(convKey, 'json');
        if (convState) {
          await handleAdminConvStep(env, msg, convState, convKey);
          return new Response('OK');
        }
      }

      // Команды
      if (msg.text?.startsWith('/start')) {
        const miniAppUrl = env.MINIAPP_URL ?? new URL(request.url).origin;
        await sendStart(env, msg.chat.id, miniAppUrl);
        return new Response('OK');
      }

      if (msg.text?.startsWith('/songs') && isAdmin) {
        await handleSongsCommand(env, msg.chat.id);
        return new Response('OK');
      }

      if (msg.text?.startsWith('/sync') && isAdmin) {
        await sendMessage(env.BOT_TOKEN, msg.chat.id, '🔄 Синхронизация запущена…');
        ctx.waitUntil(runSync(env, msg.chat.id, webhookUrl));
        return new Response('OK');
      }
    }

    // ── Пост в канале ──────────────────────────────────────────────────
    const post = update.channel_post;
    if (post && String(post.chat.id) === env.CHANNEL_ID) {
      await processPost(env, post);
    }
  } catch (err) {
    console.error('webhook error:', err);
  }

  return new Response('OK');
}

// ── Webhook-watchdog (вызывается из cron hourly) ──────────────────────────────

export async function ensureWebhookActive(env: Env, expectedUrl?: string): Promise<void> {
  try {
    const url  = expectedUrl ?? `${env.MINIAPP_URL ?? 'https://minisound.abutukhliev.workers.dev'}/webhook`;
    const info = await getWebhookInfo(env.BOT_TOKEN);
    if (info.url !== url) {
      console.log(`[cron] webhook URL wrong (${info.url || 'empty'}), re-registering → ${url}`);
      await setWebhook(env.BOT_TOKEN, url, env.WEBHOOK_SECRET || undefined);
    }
  } catch (err) {
    console.error('[cron] ensureWebhookActive:', err);
  }
}

// ── /sync — забрать пропущенные апдейты ──────────────────────────────────────

async function runSync(env: Env, chatId: number, webhookUrl: string): Promise<void> {
  let processed = 0;
  try {
    await deleteWebhook(env.BOT_TOKEN);
    let offset: number | undefined;

    while (true) {
      const updates = await getUpdates(env.BOT_TOKEN, offset, 100);
      if (!updates.length) break;
      for (const upd of updates) {
        if (upd.channel_post && String(upd.channel_post.chat.id) === env.CHANNEL_ID) {
          try { await processPost(env, upd.channel_post); processed++; }
          catch (err) { console.error('sync processPost:', err); }
        }
        offset = upd.update_id + 1;
      }
      if (updates.length < 100) break;
    }

    await setWebhook(env.BOT_TOKEN, webhookUrl, env.WEBHOOK_SECRET || undefined);
    await sendMessage(env.BOT_TOKEN, chatId, `✅ Синхронизация завершена.\nОбработано: <b>${processed}</b> постов.`);
  } catch (err) {
    await setWebhook(env.BOT_TOKEN, webhookUrl, env.WEBHOOK_SECRET || undefined).catch(() => {});
    await sendMessage(env.BOT_TOKEN, chatId, `❌ Ошибка: ${String(err)}`).catch(() => {});
  }
}

// ── /start ────────────────────────────────────────────────────────────────────

async function sendStart(env: Env, chatId: number, miniAppUrl: string): Promise<void> {
  await sendMessage(env.BOT_TOKEN, chatId,
    '<b>MiniSound</b>\n\nАудио-стриминг прямо в Telegram — вся твоя музыка в одном приложении.',
    { inline_keyboard: [[{ text: '▶ Открыть MiniSound', web_app: { url: miniAppUrl } }]] }
  );
}

// ── /songs — admin-панель ────────────────────────────────────────────────────

async function handleSongsCommand(env: Env, chatId: number): Promise<void> {
  const count = await countTracks(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  await sendMessage(env.BOT_TOKEN, chatId,
    `🎵 <b>Панель управления</b>\n\nТреков в базе: <b>${count}</b>`,
    { inline_keyboard: [[{ text: '➕ Добавить музыку', callback_data: 'admin_add' }]] }
  );
}

// ── Обработка нажатий inline-кнопок ─────────────────────────────────────────

async function handleCallbackQuery(env: Env, cb: CallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id;
  if (!chatId) return;
  const isAdmin = !!env.ADMIN_ID && String(cb.from.id) === env.ADMIN_ID;

  if (cb.data === 'admin_add' && isAdmin) {
    await answerCallbackQuery(env.BOT_TOKEN, cb.id);
    const convKey = `admin_conv:${chatId}`;
    await env.PENDING_MEDIA.put(convKey, JSON.stringify({ step: 'wait_audio' } as AdminConvState), { expirationTtl: KV_CONV_TTL });
    await sendMessage(env.BOT_TOKEN, chatId, '🎧 Пришли аудиофайл:');
    return;
  }

  if (cb.data === 'admin_keep_title' && isAdmin) {
    await answerCallbackQuery(env.BOT_TOKEN, cb.id);
    const convKey   = `admin_conv:${chatId}`;
    const convState = await env.PENDING_MEDIA.get<AdminConvState>(convKey, 'json');
    if (!convState || convState.step !== 'wait_title') return;

    const next: AdminConvState = { ...convState, step: 'wait_cover', title: convState.suggestedTitle };
    await env.PENDING_MEDIA.put(convKey, JSON.stringify(next), { expirationTtl: KV_CONV_TTL });
    await sendMessage(env.BOT_TOKEN, chatId, '🖼 Теперь пришли обложку.\nИли напиши /skip чтобы пропустить.');
    return;
  }
}

// ── Admin-диалог: пошаговая обработка сообщений ──────────────────────────────

async function handleAdminConvStep(
  env: Env, msg: Message, state: AdminConvState, convKey: string
): Promise<void> {
  const chatId = msg.chat.id;

  // ── Шаг 1: ждём аудио ────────────────────────────────────────────────
  if (state.step === 'wait_audio') {
    const audio = msg.audio ?? (
      msg.document?.mime_type?.startsWith('audio/') ? msg.document : undefined
    );
    if (!audio) {
      await sendMessage(env.BOT_TOKEN, chatId, '⚠️ Нужен аудиофайл. Пришли MP3, M4A или другой аудиофайл.');
      return;
    }

    const rawName = msg.audio?.file_name ?? msg.document?.file_name ?? 'Unknown Track';
    // Убираем расширение и лишние символы из имени файла
    const suggested = rawName
      .replace(/\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|aiff?)$/i, '')
      .replace(/[-_]/g, ' ')
      .trim();

    const next: AdminConvState = {
      step:           'wait_title',
      audioFileId:    audio.file_id,
      audioDuration:  msg.audio?.duration ?? msg.document?.duration,
      audioMsgId:     msg.message_id,
      adminChatId:    chatId,
      suggestedTitle: suggested,
    };
    await env.PENDING_MEDIA.put(convKey, JSON.stringify(next), { expirationTtl: KV_CONV_TTL });

    await sendMessage(env.BOT_TOKEN, chatId,
      `Введите название трека:`,
      { inline_keyboard: [[{ text: `Оставить: ${suggested}`, callback_data: 'admin_keep_title' }]] }
    );
    return;
  }

  // ── Шаг 2: ждём название трека ───────────────────────────────────────
  if (state.step === 'wait_title') {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/')) {
      await sendMessage(env.BOT_TOKEN, chatId, '⚠️ Введи текстовое название трека.');
      return;
    }

    const next: AdminConvState = { ...state, step: 'wait_cover', title: text };
    await env.PENDING_MEDIA.put(convKey, JSON.stringify(next), { expirationTtl: KV_CONV_TTL });
    await sendMessage(env.BOT_TOKEN, chatId, '🖼 Пришли обложку.\nИли напиши /skip чтобы пропустить.');
    return;
  }

  // ── Шаг 3: ждём обложку ──────────────────────────────────────────────
  if (state.step === 'wait_cover') {
    // /skip — завершаем без обложки
    if (msg.text === '/skip') {
      await env.PENDING_MEDIA.delete(convKey);
      await finishAdminUpload(env, state, msg, undefined);
      return;
    }

    if (!msg.photo?.length) {
      await sendMessage(env.BOT_TOKEN, chatId, '⚠️ Нужно изображение. Пришли фото или /skip.');
      return;
    }

    // Берём фото наибольшего размера
    const largest = msg.photo.reduce((a, b) => (b.file_size ?? 0) > (a.file_size ?? 0) ? b : a);
    await env.PENDING_MEDIA.delete(convKey);
    await finishAdminUpload(env, state, msg, largest.file_id);
    return;
  }
}

// ── Финализация загрузки треков через admin-панель ────────────────────────────

async function finishAdminUpload(
  env: Env, state: AdminConvState, msg: Message, thumbFileId: string | undefined
): Promise<void> {
  const chatId   = state.adminChatId!;
  const title    = state.title ?? state.suggestedTitle ?? 'Unknown Track';
  const username = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name ?? 'Admin');
  const date     = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. Сохраняем в Supabase напрямую (не ждём webhook)
  await insertTrack(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    title,
    artist:            null,
    audio_file_id:     state.audioFileId!,
    thumbnail_file_id: thumbFileId ?? null,
    duration:          state.audioDuration ?? null,
    genre:             null,
    message_id:        null,
  });

  // 2. Копируем аудио в канал (caption в формате, который parseCaption понимает)
  //    Если webhook его увидит и попытается вставить снова — 409 будет проигнорирован.
  const channelCaption = `${title}\n📅 ${date}\n👤 ${username}\n✅ Добавлено`;
  await copyMessage(env.BOT_TOKEN, env.CHANNEL_ID, chatId, state.audioMsgId!, channelCaption);

  // 3. Копируем обложку в канал (опционально)
  if (thumbFileId) {
    await sendPhoto(env.BOT_TOKEN, env.CHANNEL_ID, thumbFileId, `Обложка: ${title}`);
  }

  // 4. Подтверждение администратору
  await sendMessage(env.BOT_TOKEN, chatId,
    `✅ <b>Трек добавлен!</b>\n\n` +
    `📌 Название: ${title}\n` +
    `📅 Дата добавления: ${date}\n` +
    `👤 Кто добавил: ${username}\n` +
    `✅ Статус: добавлено`
  );
}

// ── Обработка постов канала ───────────────────────────────────────────────────

async function processPost(
  env: Env, post: NonNullable<TelegramUpdate['channel_post']>
): Promise<void> {
  const mgId = post.media_group_id;

  // ── Аудио ────────────────────────────────────────────────────────────
  if (post.audio) {
    const audio   = post.audio;
    const caption = post.caption ?? audio.title ?? audio.file_name ?? 'Unknown Track';
    const { title, artist, genre } = parseCaption(caption);

    if (!mgId) {
      await insertTrack(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        title, artist,
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
        title, artist,
        audio_file_id:     audio.file_id,
        thumbnail_file_id: pending.thumbnailFileId,
        duration:          audio.duration,
        genre,
        message_id:        post.message_id,
      });
      await env.PENDING_MEDIA.delete(kvKey);
    } else {
      await env.PENDING_MEDIA.put(kvKey, JSON.stringify({
        audioFileId: audio.file_id, title, artist, genre,
        duration: audio.duration, messageId: post.message_id,
      } as PendingMedia), { expirationTtl: KV_MEDIA_TTL });
    }
    return;
  }

  // ── Фото в медиагруппе (обложка к аудио) ─────────────────────────────
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
      await env.PENDING_MEDIA.put(kvKey, JSON.stringify({ ...(pending ?? {}), thumbnailFileId: largest.file_id } as PendingMedia), { expirationTtl: KV_MEDIA_TTL });
    }
    return;
  }

  // ── Smart photo matching: отдельное фото/изображение без медиагруппы ──
  // Если имя файла (или caption) совпадает с началом названия трека в БД —
  // автоматически назначаем его обложкой.

  // Случай А: изображение отправлено как Document (сохраняет имя файла)
  if (post.document && post.document.mime_type?.startsWith('image/') && !mgId) {
    const rawName = post.document.file_name ?? '';
    const prefix  = rawName.replace(/\.[^.]+$/, '').trim(); // убираем расширение
    if (prefix) {
      await updateThumbnailByTitlePrefix(
        env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
        prefix, post.document.file_id
      );
    }
    return;
  }

  // Случай Б: фото без медиагруппы, у которого есть caption с именем трека
  if (post.photo?.length && !mgId && post.caption) {
    const prefix = post.caption.split('\n')[0].replace(/\.[^.]+$/, '').trim();
    if (prefix) {
      const largest = post.photo.reduce((a, b) => (b.file_size ?? 0) > (a.file_size ?? 0) ? b : a);
      await updateThumbnailByTitlePrefix(
        env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
        prefix, largest.file_id
      );
    }
  }
}
