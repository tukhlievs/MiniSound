#!/usr/bin/env python3
"""
MiniSound — массовый импорт из YouTube / SoundCloud / любого источника yt-dlp.

Что делает:
  1. Скачивает аудио + обложку через yt-dlp (поддерживает плейлисты,
     отдельные треки, SoundCloud-сеты и ещё 1000+ сайтов).
  2. Загружает каждый трек в Telegram-канал MiniSound Storage через Telethon
     (лимит 2 GB, без ограничений Bot API).
  3. Бот автоматически обрабатывает каждый пост и сохраняет в Supabase.
  4. Ведёт лог загруженных треков — можно прерваться и продолжить.

Установка:
    pip install -r scripts/requirements.txt
    # yt-dlp должен быть установлен: pip install yt-dlp
    # ffmpeg нужен для конвертации: https://ffmpeg.org/download.html

Получение api_id / api_hash:
    → https://my.telegram.org/apps → создай приложение

Запуск:
    python scripts/bulk_yt.py "URL_ПЛЕЙЛИСТА_ИЛИ_ТРЕКА"

Примеры:
    python scripts/bulk_yt.py "https://youtube.com/playlist?list=PLxxx"
    python scripts/bulk_yt.py "https://soundcloud.com/artist/sets/my-set"
    python scripts/bulk_yt.py "https://youtu.be/dQw4w9WgXcQ"
    python scripts/bulk_yt.py "https://soundcloud.com/artist/trackname"
"""

import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ── ─────────────────────────────────────────────────────────────── ──
#   НАСТРОЙКИ — заполни перед запуском
# ── ─────────────────────────────────────────────────────────────── ──

API_ID   = 0    # int  — из my.telegram.org/apps
API_HASH = ''   # str  — из my.telegram.org/apps

# ID канала MiniSound Storage (отрицательное число вида -100...)
STORAGE_CHANNEL_ID = 0

# Жанровый хэштег для всех треков из этой загрузки (можно оставить пустым)
# Пример: '#pop'  или  '#electronic'  или  ''
GENRE_TAG = ''

# Качество аудио (кбит/с)
AUDIO_QUALITY = '192'

# Задержка между загрузками (сек.) — не спамим Telegram
UPLOAD_DELAY = 1.5

# Удалять файлы после успешной загрузки
CLEANUP = True

# ── Не менять ────────────────────────────────────────────────────────

DOWNLOAD_DIR = Path('./ms_downloads')
LOG_FILE     = Path('./ms_uploaded.txt')   # ID уже загруженных треков

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s', datefmt='%H:%M:%S')
log = logging.getLogger('minisound')


# ── Шаг 1: скачать через yt-dlp ──────────────────────────────────────

def ytdlp_download(url: str, output_dir: Path) -> list[Path]:
    """
    Скачивает плейлист/трек. Возвращает список info.json-файлов.
    Каждый трек = {title}.mp3 + {title}.jpg + {title}.info.json
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    template = str(output_dir / '%(id)s.%(ext)s')

    cmd = [
        'yt-dlp',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', AUDIO_QUALITY,

        # Обложки: скачать отдельно + встроить в mp3
        '--write-thumbnail',
        '--convert-thumbnails', 'jpg',
        '--embed-thumbnail',

        # Метаданные: запись в отдельный json + встроить в mp3
        '--write-info-json',
        '--add-metadata',

        # Не скачивать то, что уже есть
        '--no-overwrites',

        # Вывод — одна строка на трек
        '--quiet',
        '--no-warnings',
        '--progress',

        '-o', template,
        url,
    ]

    log.info(f'Запускаю yt-dlp...')
    result = subprocess.run(cmd)
    if result.returncode not in (0, 1):   # 1 = частичная ошибка (некоторые треки 404)
        log.error('yt-dlp завершился с ошибкой')

    return sorted(output_dir.glob('*.info.json'))


def load_uploaded_ids() -> set:
    if LOG_FILE.exists():
        return set(LOG_FILE.read_text().splitlines())
    return set()


def mark_uploaded(track_id: str):
    with open(LOG_FILE, 'a') as f:
        f.write(track_id + '\n')


def parse_info(json_path: Path) -> dict:
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)
    return {
        'id':       data.get('id', json_path.stem),
        'title':    data.get('title',    json_path.stem),
        'artist':   data.get('uploader') or data.get('artist') or '',
        'duration': int(data.get('duration') or 0),
        'audio':    json_path.with_suffix('.mp3'),
        'cover':    json_path.with_suffix('.jpg'),
    }


# ── Шаг 2: загрузить в Telegram через Telethon ───────────────────────

async def upload_all(url: str):
    # Импортируем здесь чтобы не падать если не установлен
    try:
        from telethon import TelegramClient
        from telethon.tl.types import DocumentAttributeAudio
    except ImportError:
        log.error('Установи: pip install telethon')
        sys.exit(1)

    if API_ID == 0 or not API_HASH:
        log.error('Заполни API_ID и API_HASH в начале скрипта.')
        sys.exit(1)

    if STORAGE_CHANNEL_ID == 0:
        log.error('Заполни STORAGE_CHANNEL_ID.')
        sys.exit(1)

    # Скачиваем
    info_files = ytdlp_download(url, DOWNLOAD_DIR)
    if not info_files:
        log.warning('Нечего загружать — yt-dlp не скачал ни одного трека.')
        return

    log.info(f'Скачано треков: {len(info_files)}')

    uploaded_ids = load_uploaded_ids()
    uploaded     = 0
    skipped      = 0
    errors       = 0

    async with TelegramClient('ms_upload_session', API_ID, API_HASH) as client:
        me = await client.get_me()
        log.info(f'Telegram: вошли как {me.first_name} (@{me.username})')

        channel = await client.get_entity(STORAGE_CHANNEL_ID)

        for info_path in info_files:
            track = parse_info(info_path)

            # Пропускаем уже загруженные
            if track['id'] in uploaded_ids:
                skipped += 1
                continue

            if not track['audio'].exists():
                log.warning(f'  ⚠ Нет аудиофайла: {track["audio"].name}')
                errors += 1
                continue

            # Строим caption для нашего бота:
            # "Title - Artist #genre"  (parseCaption понимает этот формат)
            caption_parts = []
            if track['artist']:
                caption_parts.append(f"{track['title']} - {track['artist']}")
            else:
                caption_parts.append(track['title'])
            if GENRE_TAG:
                caption_parts.append(GENRE_TAG)
            caption = ' '.join(caption_parts)

            try:
                log.info(f'  ↑ [{uploaded + 1}] {track["title"]}')

                # Загружаем аудио как аудио-сообщение (не как файл-документ)
                await client.send_file(
                    channel,
                    file=str(track['audio']),
                    caption=caption,
                    attributes=[DocumentAttributeAudio(
                        duration=track['duration'],
                        title=track['title'],
                        performer=track['artist'] or '',
                    )],
                    force_document=False,
                )

                # Загружаем обложку отдельным сообщением с caption = title
                # (бот подхватит через smart photo matching по title-prefix)
                if track['cover'].exists():
                    await asyncio.sleep(0.3)
                    await client.send_file(
                        channel,
                        file=str(track['cover']),
                        caption=track['title'],   # smart matching ищет по этой строке
                    )

                mark_uploaded(track['id'])
                uploaded += 1

                # Чистим файлы
                if CLEANUP:
                    track['audio'].unlink(missing_ok=True)
                    track['cover'].unlink(missing_ok=True)
                    info_path.unlink(missing_ok=True)

                await asyncio.sleep(UPLOAD_DELAY)

            except Exception as e:
                log.error(f'  ✗ Ошибка при загрузке {track["title"]}: {e}')
                errors += 1
                await asyncio.sleep(UPLOAD_DELAY * 2)

    # Итог
    log.info('')
    log.info('══════════════════════════════════')
    log.info(f'Загружено  : {uploaded}')
    log.info(f'Пропущено  : {skipped} (уже были)')
    log.info(f'Ошибки     : {errors}')
    log.info('')
    log.info('Бот обработает треки в течение нескольких секунд.')
    log.info('Если что-то потерялось — напиши боту /sync')

    # Чистим пустую папку
    if CLEANUP:
        try:
            DOWNLOAD_DIR.rmdir()
        except OSError:
            pass  # папка не пустая — не страшно


# ── Точка входа ───────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    asyncio.run(upload_all(sys.argv[1]))
