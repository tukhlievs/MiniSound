#!/usr/bin/env python3
"""
MiniSound Archive Uploader — загружает музыку из ZIP или папки в Telegram-канал.

Поддерживаемые структуры архива:
  плейлист/название_трека/музыка.mp3  +  обложка.jpg     ← твой вариант
  плейлист/музыка.mp3  +  обложка.jpg                    ← плоская структура
  музыка.mp3  +  обложка.jpg                              ← только файлы в корне

Обложка ищется автоматически в той же папке что и mp3.
Жанр берётся из имени папки-плейлиста → становится хэштегом #жанр.
Название трека берётся из имени папки трека (или имени файла).

Требования: только стандартная библиотека Python + pip install requests

Запуск:
  python scripts/upload_archive.py archive.zip
  python scripts/upload_archive.py /путь/к/распакованной/папке
"""

import os
import sys
import time
import zipfile
import requests
from pathlib import Path

# ── Заполни перед запуском ────────────────────────────────────────────────────

BOT_TOKEN  = ''   # токен бота (из @BotFather)
CHANNEL_ID = 0    # ID канала MiniSound Storage — отрицательное число вида -100...

DELAY = 1.5       # секунд между загрузками (не спамим Telegram)

# ─────────────────────────────────────────────────────────────────────────────

AUDIO_EXTS = {'.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac'}
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp'}


def api(method, **kwargs):
    """Вызов Telegram Bot API."""
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/{method}'
    r = requests.post(url, timeout=120, **kwargs)
    return r.json()


def upload_audio(path: Path, title: str, caption: str) -> bool:
    """Отправляет аудиофайл в канал. Возвращает True при успехе."""
    with open(path, 'rb') as f:
        result = api('sendAudio',
            data={
                'chat_id': CHANNEL_ID,
                'caption': caption,
                'title':   title,
            },
            files={'audio': (path.name, f, 'audio/mpeg')},
        )
    if not result.get('ok'):
        print(f'   ✗ sendAudio: {result.get("description")}')
        return False
    return True


def upload_photo(path: Path, caption: str) -> bool:
    """Отправляет фото-обложку в канал."""
    with open(path, 'rb') as f:
        result = api('sendPhoto',
            data={'chat_id': CHANNEL_ID, 'caption': caption},
            files={'photo': (path.name, f)},
        )
    return result.get('ok', False)


def find_cover(folder: Path) -> Path | None:
    """Ищет файл-обложку в папке (jpg/png/webp)."""
    for ext in IMAGE_EXTS:
        found = sorted(folder.glob(f'*{ext}'))
        if found:
            return found[0]
    return None


def collect_tracks(root: Path) -> list[dict]:
    """
    Обходит дерево папок и собирает треки.
    Возвращает список словарей: {audio, cover, title, genre}.
    """
    tracks = []
    seen   = set()

    for audio in sorted(root.rglob('*')):
        if audio.suffix.lower() not in AUDIO_EXTS:
            continue
        if audio in seen:
            continue
        seen.add(audio)

        folder = audio.parent

        # Название трека = имя папки (если она содержит только этот трек)
        # или имя файла без расширения
        title = folder.name if folder != root else audio.stem
        # Убираем технические суффиксы вроде "(Official Audio)" etc.
        title = title.strip()

        # Жанр/плейлист = родительская папка папки трека
        genre = ''
        if folder != root and folder.parent != root:
            genre = folder.parent.name.lower().split()[0]
            genre = ''.join(c for c in genre if c.isalnum())
        elif folder != root:
            genre = folder.name.lower().split()[0]
            genre = ''.join(c for c in genre if c.isalnum())

        cover = find_cover(folder)

        tracks.append({
            'audio': audio,
            'cover': cover,
            'title': title,
            'genre': genre,
        })

    return tracks


def run(source: str):
    source_path = Path(source)

    # Если передан ZIP — распаковываем рядом
    if source_path.suffix.lower() == '.zip':
        extract_to = source_path.parent / source_path.stem
        if not extract_to.exists():
            print(f'Распаковываем {source_path.name} → {extract_to}...')
            with zipfile.ZipFile(source_path) as z:
                z.extractall(extract_to)
        else:
            print(f'Папка {extract_to} уже существует, используем её.')
        root = extract_to
    elif source_path.is_dir():
        root = source_path
    else:
        print(f'Файл не найден: {source}')
        sys.exit(1)

    tracks = collect_tracks(root)

    if not tracks:
        print('Аудиофайлы не найдены. Проверь структуру архива.')
        sys.exit(1)

    print(f'\nНайдено треков: {len(tracks)}')
    print('─' * 45)

    uploaded = 0
    errors   = 0

    for i, t in enumerate(tracks, 1):
        title  = t['title']
        genre  = t['genre']
        caption = f'{title} #{genre}' if genre else title

        print(f'[{i:>3}/{len(tracks)}] {title[:45]}', end=' ', flush=True)

        try:
            ok = upload_audio(t['audio'], title, caption)
            if not ok:
                errors += 1
                time.sleep(DELAY)
                continue

            print('✓', end=' ', flush=True)
            uploaded += 1

            # Обложка — загружаем сразу следом, caption = название (для smart matching)
            if t['cover']:
                time.sleep(0.5)
                ok2 = upload_photo(t['cover'], title)
                print('🖼' if ok2 else '(нет обл.)', end='')

            print()
            time.sleep(DELAY)

        except Exception as e:
            print(f'✗ {e}')
            errors += 1
            time.sleep(DELAY * 2)

    print('─' * 45)
    print(f'Загружено : {uploaded}')
    print(f'Ошибки    : {errors}')
    if uploaded:
        print('\n✅ Готово! Бот добавит треки в Supabase автоматически.')
        print('   Если что-то не подхватилось — напиши боту /sync')


if __name__ == '__main__':
    if not BOT_TOKEN:
        print('Укажи BOT_TOKEN в начале скрипта.')
        sys.exit(1)
    if CHANNEL_ID == 0:
        print('Укажи CHANNEL_ID в начале скрипта.')
        sys.exit(1)
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    run(sys.argv[1])
