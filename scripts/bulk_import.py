"""
MiniSound — массовый импорт аудио в приватный канал.

Скрипт перебирает сообщения в указанном чате/канале и пересылает все аудио
(тип Audio И Document с аудио mime-type) в канал MiniSound Storage.
Бот автоматически обработает каждое пересланное сообщение через вебхук.

Установка:
    pip install telethon

Получение api_id и api_hash:
    1. Зайди на https://my.telegram.org/apps
    2. Войди в аккаунт
    3. Создай приложение → скопируй api_id и api_hash

Запуск:
    python bulk_import.py
"""

import asyncio
import sys
from telethon import TelegramClient
from telethon.tl.types import (
    MessageMediaDocument, MessageMediaAudio,
    DocumentAttributeAudio,
)

# ── Настройки ─────────────────────────────────────────────────────────────────
# Замени на свои значения

API_ID   = 0           # int, из my.telegram.org
API_HASH = ''          # str, из my.telegram.org

# Источник: username (@channel) или числовой chat_id (например -1001234567890)
SOURCE = '@your_source_channel'

# Приватный канал MiniSound Storage — числовой ID (отрицательное число вида -100...)
STORAGE_CHANNEL_ID = -1000000000000  # замени

# Сколько сообщений читать из источника (0 = все)
LIMIT = 0

# Задержка между пересылками в секундах (не спами Telegram)
DELAY = 0.8

# ── ─────────────────────────────────────────────────────────────────────────────

AUDIO_MIME_PREFIXES = ('audio/',)


def is_audio_message(msg) -> bool:
    """Проверяет, содержит ли сообщение аудиофайл."""
    if not msg.media:
        return False

    # Тип Audio (отправлено через «музыка»)
    if isinstance(msg.media, MessageMediaAudio):
        return True

    # Тип Document с аудио mime-type (отправлено как файл)
    if isinstance(msg.media, MessageMediaDocument):
        doc = msg.media.document
        mime = getattr(doc, 'mime_type', '') or ''
        if any(mime.startswith(p) for p in AUDIO_MIME_PREFIXES):
            return True

    return False


async def main():
    if API_ID == 0 or not API_HASH:
        print('❌ Укажи API_ID и API_HASH в скрипте.')
        sys.exit(1)

    if STORAGE_CHANNEL_ID == -1000000000000:
        print('❌ Укажи STORAGE_CHANNEL_ID — числовой ID канала MiniSound Storage.')
        sys.exit(1)

    print(f'Подключаемся к Telegram...')
    async with TelegramClient('minisound_import', API_ID, API_HASH) as client:
        me = await client.get_me()
        print(f'Вошли как: {me.first_name} (@{me.username})')

        print(f'\nСканируем источник: {SOURCE}')
        total     = 0
        forwarded = 0
        skipped   = 0

        async for msg in client.iter_messages(SOURCE, limit=LIMIT or None):
            total += 1

            if not is_audio_message(msg):
                skipped += 1
                continue

            try:
                await client.forward_messages(STORAGE_CHANNEL_ID, msg)
                forwarded += 1
                title = getattr(msg, 'file', None)
                title = title.name if title else f'msg#{msg.id}'
                print(f'  ✓ [{forwarded}] {title}')
                await asyncio.sleep(DELAY)
            except Exception as e:
                print(f'  ⚠ Ошибка msg#{msg.id}: {e}')
                await asyncio.sleep(DELAY * 2)  # при ошибке ждём дольше

        print(f'\n──────────────────────────────')
        print(f'Просмотрено сообщений : {total}')
        print(f'Переслано аудио       : {forwarded}')
        print(f'Пропущено (не аудио)  : {skipped}')
        print(f'\nБот обработает треки через несколько секунд.')
        print(f'Если что-то не подхватилось — напиши боту /sync')


if __name__ == '__main__':
    asyncio.run(main())
