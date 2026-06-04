// Переменные окружения Cloudflare Worker
export interface Env {
  BOT_TOKEN:            string;      // Telegram bot token
  CHANNEL_ID:           string;      // ID приватного канала (отрицательное число)
  SUPABASE_URL:         string;      // https://xxx.supabase.co
  SUPABASE_ANON_KEY:    string;      // Для публичного чтения (Mini App)
  SUPABASE_SERVICE_KEY: string;      // Для записи из вебхука
  WEBHOOK_SECRET:       string;      // Секрет для верификации Telegram webhook
  PENDING_MEDIA:        KVNamespace; // KV для медиагрупп + кеш file_path
  ASSETS:               Fetcher;     // Статические ассеты Next.js (web/out/)
  MINIAPP_URL?:         string;      // URL Mini App (по умолчанию — origin воркера)
}

// Трек в базе данных
export interface Track {
  id:                string;
  title:             string;
  artist:            string | null;
  audio_file_id:     string;
  thumbnail_file_id: string | null;
  duration:          number | null;
  genre:             string | null;
  message_id:        number | null;
  created_at:        string;
}

// Временное состояние медиагруппы в KV
export interface PendingMedia {
  audioFileId?:     string;
  thumbnailFileId?: string;
  title?:           string;
  artist?:          string | null;
  genre?:           string | null;
  duration?:        number;
  messageId?:       number;
}

// --- Telegram Update types ---
export interface TelegramUpdate {
  update_id:             number;
  message?:              Message;
  channel_post?:         ChannelPost;
  edited_channel_post?:  ChannelPost;
}

// Личное сообщение боту (для обработки /start)
export interface Message {
  message_id: number;
  from?:      { id: number; is_bot: boolean; first_name?: string; username?: string };
  chat:       { id: number; type: string; title?: string; username?: string };
  date:       number;
  text?:      string;
}

export interface ChannelPost {
  message_id:      number;
  chat:            { id: number; type: string; title?: string };
  date:            number;
  audio?:          TelegramAudio;
  document?:       TelegramDocument;
  photo?:          PhotoSize[];
  caption?:        string;
  media_group_id?: string;
}

export interface TelegramAudio {
  file_id:        string;
  file_unique_id: string;
  duration:       number;
  performer?:     string;
  title?:         string;
  file_name?:     string;
  mime_type?:     string;
  file_size?:     number;
  thumb?:         PhotoSize;
  thumbnail?:     PhotoSize;
}

export interface TelegramDocument {
  file_id:        string;
  file_unique_id: string;
  file_name?:     string;
  mime_type?:     string;
  thumb?:         PhotoSize;
  thumbnail?:     PhotoSize;
}

export interface PhotoSize {
  file_id:        string;
  file_unique_id: string;
  width:          number;
  height:         number;
  file_size?:     number;
}

export interface TelegramFileResponse {
  ok:      boolean;
  result?: { file_path: string };
  description?: string;
}
