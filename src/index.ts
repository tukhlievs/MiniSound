import { handleWebhook }                                      from './webhook';
import { resolveFilePath, buildFileUrl, contentTypeForPath } from './telegram';
import { getTracks }                                          from './supabase';
import type { Env }                                           from './types';

const CORS: HeadersInit = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Bot-Api-Secret-Token, Range',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Проксирует файл из Telegram не раскрывая токен клиенту.
// Поддерживает Range (перемотка аудио) + автообновление кеша при истечении file_path.
async function proxyTelegramFile(
  env: Env,
  fileId: string,
  request: Request,
  kind: 'audio' | 'image'
): Promise<Response> {
  let filePath: string;
  try {
    filePath = await resolveFilePath(env, fileId);
  } catch (err) {
    return json({ error: String(err) }, 502);
  }

  const range = request.headers.get('Range');
  const upstream = async (p: string) =>
    fetch(buildFileUrl(env.BOT_TOKEN, p), {
      headers: range ? { Range: range } : {},
    });

  let res = await upstream(filePath);

  // file_path мог протухнуть — обновляем кеш и повторяем один раз
  if (res.status === 401 || res.status === 404 || res.status === 410) {
    try {
      filePath = await resolveFilePath(env, fileId, true);
      res = await upstream(filePath);
    } catch (err) {
      return json({ error: String(err) }, 502);
    }
  }

  if (!res.ok && res.status !== 206) {
    return new Response('Upstream error', { status: 502, headers: CORS });
  }

  const headers = new Headers(CORS);
  headers.set('Content-Type', contentTypeForPath(filePath));

  const contentLength = res.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);

  if (kind === 'audio') {
    headers.set('Accept-Ranges', 'bytes');
    const contentRange = res.headers.get('Content-Range');
    if (contentRange) headers.set('Content-Range', contentRange);
    headers.set('Cache-Control', 'public, max-age=3000');
  } else {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Preflight CORS
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /webhook — Telegram Bot API ────────────────────────────────────
    if (path === '/webhook' && method === 'POST') {
      return handleWebhook(request, env);
    }

    // ── GET /api/tracks ──────────────────────────────────────────────────────
    if (path === '/api/tracks' && method === 'GET') {
      const genre  = url.searchParams.get('genre') ?? undefined;
      const limit  = Number.parseInt(url.searchParams.get('limit')  ?? '50', 10);
      const offset = Number.parseInt(url.searchParams.get('offset') ?? '0',  10);
      try {
        const tracks = await getTracks(
          env.SUPABASE_URL,
          env.SUPABASE_ANON_KEY,
          genre,
          Number.isFinite(limit)  ? limit  : 50,
          Number.isFinite(offset) ? offset : 0,
        );
        return json(tracks);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // ── GET /api/stream/:fileId — проксирует аудио (Range, токен скрыт) ─────
    const streamMatch = path.match(/^\/api\/stream\/(.+)$/);
    if (streamMatch && method === 'GET') {
      return proxyTelegramFile(env, decodeURIComponent(streamMatch[1]), request, 'audio');
    }

    // ── GET /api/thumbnail/:fileId — проксирует обложку (долгий кеш) ────────
    const thumbMatch = path.match(/^\/api\/thumbnail\/(.+)$/);
    if (thumbMatch && method === 'GET') {
      return proxyTelegramFile(env, decodeURIComponent(thumbMatch[1]), request, 'image');
    }

    // ── Всё остальное → Next.js статические ассеты (web/out/) ───────────────
    // Cloudflare Workers + Assets: env.ASSETS обслуживает папку web/out/
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
