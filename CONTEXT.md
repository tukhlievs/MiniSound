# MiniSound — Контекст проекта

Дата последнего обновления: 2026-06-06  
Репозиторий: https://github.com/tukhlievs/MiniSound  
URL приложения: https://minisound.abutukhliev.workers.dev

---

## Что такое MiniSound

Аудио-стриминговая площадка в Telegram Mini App.  
Приватный Telegram-канал **MiniSound Storage** = хранилище аудио.  
Бот парсит посты из канала, сохраняет метаданные в Supabase.  
Фронтенд показывает библиотеку, аудио стримится через Cloudflare Worker (токен скрыт).

---

## Архитектура

```
iPhone/PC (загрузка) ──→ Telegram канал MiniSound Storage
                                  │ webhook
                                  ▼
                       Cloudflare Worker (worker/index.ts)
                         ├── POST /webhook  → парсит посты, INSERT в Supabase
                         ├── GET /api/tracks → список треков из Supabase
                         ├── GET /api/stream/:fileId → проксирует аудио (Range)
                         ├── GET /api/thumbnail/:fileId → проксирует обложки
                         └── GET /* → Next.js статика (web/out/)
                                  │
                                  ▼
                           Supabase (таблица tracks)
                                  │
                                  ▼
                    Next.js Mini App → Telegram WebView
```

---

## Структура репозитория

```
MiniSound/
├── worker/          ← Cloudflare Worker (TypeScript)
│   ├── index.ts     ← роутер + прокси + scheduled cron
│   ├── webhook.ts   ← парсинг канала + admin-панель
│   ├── telegram.ts  ← Bot API хелперы
│   ├── supabase.ts  ← Supabase REST хелперы
│   └── types.ts     ← общие типы
│
├── web/             ← Next.js 14 App Router (фронтенд)
│   ├── app/
│   │   ├── layout.tsx       ← шрифты, провайдеры, dark/light inline script
│   │   ├── page.tsx         ← главная: хедер + жанры + треки + навбар
│   │   ├── providers.tsx    ← QueryClient + ThemeProvider
│   │   └── globals.css      ← CSS vars (dark/light), EQ анимации
│   ├── components/
│   │   ├── layout/Header.tsx
│   │   ├── navigation/BottomNav.tsx  ← General / Search / Settings
│   │   ├── player/
│   │   │   ├── AudioController.tsx  ← headless, управляет HTMLAudioElement
│   │   │   ├── MiniPlayer.tsx       ← sticky bottom, rAF прогресс
│   │   │   └── FullPlayer.tsx       ← translateY slide-up, blur арт-фон
│   │   ├── tabs/
│   │   │   ├── SearchTab.tsx        ← заглушка "скоро"
│   │   │   └── SettingsTab.tsx      ← профиль TG + тема + поддержка
│   │   ├── tracks/
│   │   │   ├── FeaturedCards.tsx    ← горизонт. карточки "Недавно добавленные"
│   │   │   ├── TrackCard.tsx        ← строка трека, memo + производные подписки
│   │   │   └── TrackList.tsx        ← список + skeleton
│   │   └── ui/                      ← shadcn/ui компоненты
│   ├── context/ThemeContext.tsx      ← dark/light, localStorage, no-flash
│   ├── hooks/
│   │   ├── useAudioProgress.ts      ← rAF → прямое DOM обновление прогресса
│   │   ├── useTelegram.ts           ← WebApp init, haptics, user, openLink
│   │   └── useTracks.ts             ← React Query + 30s refetchInterval
│   ├── lib/
│   │   ├── api.ts           ← fetchTracks, streamUrl, thumbnailUrl
│   │   ├── audioManager.ts  ← singleton HTMLAudioElement
│   │   └── utils.ts         ← cn, formatDuration, trackGradient, cleanTrackTitle
│   ├── store/playerStore.ts  ← Zustand: queue, isPlaying, progress, shuffle...
│   └── types/index.ts
│
├── supabase/
│   └── schema.sql   ← CREATE TABLE tracks + индексы + RLS
│
├── scripts/
│   ├── bulk_import.py      ← массовый импорт из Telegram канала (Telethon)
│   ├── bulk_yt.py          ← скачать с YouTube/SoundCloud + залить (Telethon)
│   ├── upload_archive.py   ← загрузить ZIP/папку с mp3 (только requests)
│   └── requirements.txt    ← telethon, yt-dlp, mutagen
│
├── wrangler.toml    ← Worker + Assets (web/out) + KV + cron
├── package.json     ← deploy = build:web + wrangler deploy
└── CONTEXT.md       ← этот файл
```

---

## Команды бота

| Команда | Кто | Что делает |
|---------|-----|-----------|
| `/start` | любой | приветствие + кнопка открыть Mini App |
| `/songs` | admin | панель: счётчик треков + добавить/список |
| `/sync` | admin | забирает пропущенные апдейты канала через getUpdates |
| `/resync` | admin | немедленная проверка канала на удалённые треки |

Admin — пользователь чей Telegram ID совпадает с секретом `ADMIN_ID`.

---

## Admin-панель (`/songs`)

Диалог добавления трека:
1. `/songs` → счётчик + кнопки
2. «Добавить музыку» → отправить аудиофайл
3. Бот предлагает название (из имени файла) → можно изменить или оставить
4. Бот просит обложку → отправить фото или `/skip`
5. Бот: вставляет в Supabase + копирует в канал + подтверждает

«Список треков» → пагинация по 5, кнопка ❌ на каждом → удаление из Supabase.

---

## Формат постов в канале

```
Название трека - Исполнитель #жанр

Примеры:
Blinding Lights - The Weeknd #pop
Moonlight Sonata #classical
Just a Track Name
```

Жанры: pop, rock, hip-hop, electronic, classical, jazz, lofi, rnb  
Исполнитель и жанр — опциональны.

---

## Smart photo matching

Если отправить в канал изображение-документ с именем `EXAMPLE FUNK.png` —  
бот найдёт в Supabase треки где `title ILIKE 'EXAMPLE FUNK%'` и `thumbnail IS NULL`,  
и автоматически назначит эту картинку как обложку.

---

## Синхронизация канала

- **Cron каждый час**: проверяет что вебхук жив, восстанавливает если нет
- **Cron каждый час**: `verifyChannelTracks` — bounce-проверка постов через forwardMessage
- **`/resync`**: немедленная проверка (после ручного удаления треков из канала)
- **Фронтенд**: `refetchInterval: 30s` — пропавший из Supabase трек исчезнет с экрана за 30 сек

---

## Скрипты для массовой загрузки

**upload_archive.py** — самый простой, только `requests`:
```bash
pip install requests
# заполни BOT_TOKEN и CHANNEL_ID в начале скрипта
python scripts/upload_archive.py archive.zip
```
Структура архива: `плейлист/название_трека/музыка.mp3 + обложка.jpg`

**bulk_yt.py** — YouTube/SoundCloud → Telegram (нужен Telethon):
```bash
pip install telethon yt-dlp
# заполни API_ID, API_HASH, STORAGE_CHANNEL_ID
python scripts/bulk_yt.py "https://youtube.com/playlist?list=PLxxx"
```

**bulk_import.py** — переслать существующий Telegram-контент:
```bash
pip install telethon
# заполни API_ID, API_HASH, SOURCE, STORAGE_CHANNEL_ID
python scripts/bulk_import.py
```

---

## Деплой

```bash
# Cloudflare CI/CD автоматически при push в main
# Deploy command: npm run deploy
# (= cd web && npm install && npm run build && wrangler deploy)

# Вручную (при наличии wrangler + node):
npm run deploy
```

После деплоя перерегистрировать вебхук если изменился список allowed_updates:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://minisound.abutukhliev.workers.dev/webhook","allowed_updates":["message","channel_post","callback_query"]}'
```

---

## Переменные окружения (Cloudflare Secrets)

| Переменная | Описание |
|------------|----------|
| `BOT_TOKEN` | Telegram bot token |
| `CHANNEL_ID` | ID приватного канала (-100...) |
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_ANON_KEY` | для чтения (фронтенд) |
| `SUPABASE_SERVICE_KEY` | для записи (воркер) |
| `WEBHOOK_SECRET` | любая случайная строка |
| `ADMIN_ID` | Telegram user ID администратора |
| `MINIAPP_URL` | URL воркера (опционально) |

KV namespace: `PENDING_MEDIA` — буфер медиагрупп + кеш file_path

---

## Известные ограничения

- Telegram Bot API не присылает событие удаления поста → `/resync` вручную
- Загрузка с YouTube/SoundCloud через скрипт — только с личного ПК (cloud IP заблокированы)
- Лайки хранятся в localStorage (не синхронизируются между устройствами)
- Список треков ограничен 100 штуками за раз (нет infinite scroll)
- Вкладка Search — заглушка, реальный поиск не реализован

---

## Дизайн

- Тема: тёмная по умолчанию (переключается в Settings)
- Фон: `#0D0D0D` (нейтральный чёрный, без синевы)
- Акцент: белый (`rgba(255,255,255,0.92)`)
- Шрифты: Syne (логотип), DM Sans (UI), DM Mono (время)
- BottomNav: тёмная пилюля, всегда — General / Search / Settings
- Плеер: translateY slide-up (не vaul — несовместим с Telegram WebView)
- FullPlayer: динамический blur-фон из обложки (Apple Music style)
