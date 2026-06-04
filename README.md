# MiniSound — Telegram Mini App

Аудио-стриминговая площадка на базе Telegram + Cloudflare Workers + Supabase.
Приватный Telegram-канал служит хранилищем аудио, фронтенд на Next.js открывается как Mini App.

## Структура проекта

```
MiniSound/
├── worker/            ← бэкенд: Cloudflare Worker (TypeScript)
│   ├── index.ts       ← роутер: /webhook, /api/*, отдача статики
│   ├── webhook.ts     ← парсинг постов канала → Supabase
│   ├── telegram.ts    ← getFile, parseCaption
│   ├── supabase.ts    ← insertTrack, getTracks
│   └── types.ts       ← общие типы
├── web/               ← фронтенд: Next.js 14 (App Router)
│   ├── app/           ← layout, page, providers
│   ├── components/    ← layout, navigation, player, tracks, tabs, ui
│   ├── context/       ← ThemeContext (тёмная/светлая)
│   ├── hooks/         ← useTracks, useTelegram, useAudioProgress
│   ├── lib/           ← api, audioManager, utils
│   ├── store/         ← playerStore (Zustand)
│   └── types/
├── supabase/
│   └── schema.sql     ← схема БД (таблица tracks + RLS)
├── wrangler.toml      ← конфиг Worker + Assets (раздаёт web/out)
├── package.json       ← deploy-скрипт (сборка web + wrangler deploy)
└── tsconfig.json      ← конфиг TypeScript воркера
```

Единый деплой: воркер обслуживает API и одновременно раздаёт статику Next.js
(`web/out`) через биндинг Assets — один URL, без CORS, без отдельного Pages-проекта.

## Архитектура

```
Приватный канал (аудио + фото)
         │  Telegram Webhook
         ▼
Cloudflare Worker (worker/index.ts)
    ├── POST /webhook          — парсинг постов канала
    ├── GET  /api/tracks       — список треков из Supabase
    ├── GET  /api/stream/:id   — проксирует аудио (Range, токен скрыт)
    ├── GET  /api/thumbnail/:id — проксирует обложку (долгий кеш)
    └── GET  /*                — Next.js Mini App (web/out через Assets)
         │
         ▼
Supabase (таблица tracks)
```

## Быстрый старт

### 1. Supabase

Перейди в **SQL Editor** своего Supabase проекта и выполни `supabase/schema.sql`.
Возьми `Project URL` и оба ключа (`anon` и `service_role`) из Settings → API.

### 2. Telegram Bot

1. Напиши [@BotFather](https://t.me/BotFather), создай бота — получи `BOT_TOKEN`.
2. Добавь бота в приватный канал **MiniSound Storage** как администратора.
3. Отправь любое сообщение в канал, затем открой:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
   Найди `"chat":{"id":...}` — это `CHANNEL_ID` (отрицательное число вида `-100...`).

### 3. Cloudflare Workers

```bash
npm install
wrangler login

# KV namespace (буфер медиагрупп + кеш file_path)
wrangler kv namespace create PENDING_MEDIA
# Скопируй id в wrangler.toml → [[kv_namespaces]] → id

# Секреты
wrangler secret put BOT_TOKEN
wrangler secret put CHANNEL_ID
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put WEBHOOK_SECRET   # любая случайная строка: openssl rand -hex 16

# Деплой (соберёт web/out и задеплоит воркер вместе со статикой)
npm run deploy
```

После деплоя Wrangler выведет URL вида `https://minisound.YOUR_NAME.workers.dev`.

### 4. Установка вебхука

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://minisound.YOUR_NAME.workers.dev/webhook",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

Ответ должен содержать `"ok": true`.

### 5. Привязка Mini App к боту

В [@BotFather](https://t.me/BotFather): бот → **Edit Bot** → **Edit Menu Button** →
укажи URL `https://minisound.YOUR_NAME.workers.dev`.

### 6. Первый трек

Отправь в канал **MiniSound Storage** аудиофайл с подписью:
```
Название трека - Исполнитель #pop
```
Обложку можно прикрепить фото как часть альбома вместе с аудио.
Трек автоматически появится в Mini App.

## Формат подписи (caption)

```
Название - Исполнитель #жанр
```

Жанры: `pop`, `rock`, `hip-hop`, `electronic`, `classical`, `jazz`, `lofi`, `rnb`.
Исполнитель и жанр — опциональны.

## Локальная разработка

```bash
# Фронтенд (Next.js dev)
cd web && npm install && npm run dev

# Воркер (Wrangler dev) — из корня
npm run dev
```

Для вебхука при локальной разработке используй туннель (ngrok или Wrangler Dev Tunnel).
