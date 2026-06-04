import { handleWebhook }                       from './webhook';
import { resolveFilePath, buildFileUrl, contentTypeForPath } from './telegram';
import { getTracks }                            from './supabase';
import type { Env }                             from './types';

// Импорт Mini App HTML как текстового модуля (см. wrangler.toml rules + html.d.ts)
import indexHtml from '../public/index.html';

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

// Проксирует файл из Telegram, НЕ раскрывая токен клиенту.
// Поддерживает Range (перемотка аудио) и кеширование обложек.
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
  const fetchUpstream = (p: string) =>
    fetch(buildFileUrl(env.BOT_TOKEN, p), {
      headers: range ? { Range: range } : {},
    });

  let upstream = await fetchUpstream(filePath);

  // file_path протух на стороне Telegram — обновляем кеш и пробуем один раз ещё
  if (upstream.status === 401 || upstream.status === 404 || upstream.status === 410) {
    try {
      filePath = await resolveFilePath(env, fileId, true);
      upstream = await fetchUpstream(filePath);
    } catch (err) {
      return json({ error: String(err) }, 502);
    }
  }

  // 200 (полностью) и 206 (частично, при Range) — валидные ответы
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Upstream error', { status: 502, headers: CORS });
  }

  const headers = new Headers(CORS);
  headers.set('Content-Type', contentTypeForPath(filePath));

  const contentLength = upstream.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);

  if (kind === 'audio') {
    headers.set('Accept-Ranges', 'bytes');
    const contentRange = upstream.headers.get('Content-Range');
    if (contentRange) headers.set('Content-Range', contentRange);
    headers.set('Cache-Control', 'public, max-age=3000');
  } else {
    // Обложка неизменна для конкретного file_id — кешируем надолго
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /webhook — Telegram Bot API ─────────────────────────────────────
    if (path === '/webhook' && method === 'POST') {
      return handleWebhook(request, env);
    }

    // ── GET /api/tracks ───────────────────────────────────────────────────────
    if (path === '/api/tracks' && method === 'GET') {
      const genre  = url.searchParams.get('genre') ?? undefined;
      const limit  = Number.parseInt(url.searchParams.get('limit')  ?? '50', 10);
      const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);

      try {
        const tracks = await getTracks(
          env.SUPABASE_URL,
          env.SUPABASE_ANON_KEY,
          genre,
          Number.isFinite(limit)  ? limit  : 50,
          Number.isFinite(offset) ? offset : 0
        );
        return json(tracks);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // ── GET /api/stream/:fileId — проксирует аудио (Range, токен скрыт) ───────
    const streamMatch = path.match(/^\/api\/stream\/(.+)$/);
    if (streamMatch && method === 'GET') {
      return proxyTelegramFile(env, decodeURIComponent(streamMatch[1]), request, 'audio');
    }

    // ── GET /api/thumbnail/:fileId — проксирует обложку (кеш) ─────────────────
    const thumbMatch = path.match(/^\/api\/thumbnail\/(.+)$/);
    if (thumbMatch && method === 'GET') {
      return proxyTelegramFile(env, decodeURIComponent(thumbMatch[1]), request, 'image');
    }

    // ── GET / — Mini App HTML ─────────────────────────────────────────────────
    if ((path === '/' || path === '/index.html') && method === 'GET') {
      return new Response(indexHtml as string, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
