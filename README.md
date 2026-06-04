# MiniSound — Telegram Mini App

Аудио-стриминговая площадка на базе Telegram + Cloudflare Workers + Supabase.

## Архитектура

```
Приватный канал (аудио + фото)
         │  Telegram Webhook
         ▼
Cloudflare Worker (src/index.ts)
    ├── POST /webhook          — парсинг постов канала
    ├── GET  /api/tracks       — список треков из Supabase
    ├── GET  /api/stream/:id   — проксирует аудио (Range, токен скрыт)
    ├── GET  /api/thumbnail/:id — проксирует обложку (долгий кеш)
    └── GET  /                 — Mini App HTML
         │
         ▼
Supabase (таблица tracks)
```

## Быстрый старт

### 1. Supabase

Перейди в **SQL Editor** своего Supabase проекта и выполни `schema.sql`.  
Возьми `Project URL` и оба ключа (`anon` и `service_role`) из Settings → API.

### 2. Telegram Bot

1. Напиши [@BotFather](https://t.me/BotFather), создай бота — получи `BOT_TOKEN`.
2. Добавь бота в свой приватный канал **MiniSound Storage** как администратора.
3. Отправь любое сообщение в канал, затем выполни:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
   Найди в ответе `"chat":{"id":...}` — это и есть твой `CHANNEL_ID` (отрицательное число вида `-100...`).

### 3. Cloudflare Workers

```bash
npm install
wrangler login

# Создай KV namespace
wrangler kv namespace create PENDING_MEDIA
# Скопируй id из вывода в wrangler.toml → [[kv_namespaces]] → id

# Установи секреты
wrangler secret put BOT_TOKEN
wrangler secret put CHANNEL_ID
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put WEBHOOK_SECRET   # любая случайная строка, например: openssl rand -hex 16

# Деплой
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

В [@BotFather](https://t.me/BotFather):
1. Выбери своего бота → **Edit Bot** → **Edit Menu Button**
2. Укажи URL: `https://minisound.YOUR_NAME.workers.dev`

### 6. Первый трек

Отправь в канал **MiniSound Storage** аудио файл с caption:
```
Название трека - Исполнитель #pop
```
Можно добавить фото обложки как часть альбома вместе с аудио.

Трек автоматически появится в Mini App.

## Формат caption

```
Название - Исполнитель #жанр
```

Поддерживаемые жанры: `pop`, `rock`, `hip-hop`, `electronic`, `classical`, `jazz`, `lofi`, `rnb`  
Исполнитель и жанр — опциональны.

## Локальная разработка

```bash
npm run dev
```

Для тестирования вебхука используй [ngrok](https://ngrok.com/) или Wrangler's Dev Tunnel.
