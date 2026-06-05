// ── Переменные окружения Cloudflare Worker ────────────────────────────────────
export interface Env {
  BOT_TOKEN:            string;
  CHANNEL_ID:           string;
  SUPABASE_URL:         string;
  SUPABASE_ANON_KEY:    string;
  SUPABASE_SERVICE_KEY: string;
  WEBHOOK_SECRET:       string;
  PENDING_MEDIA:        KVNamespace;
  ASSETS:               Fetcher;
  MINIAPP_URL?:         string;
  ADMIN_ID?:            string;
}

// ── Трек в базе данных ────────────────────────────────────────────────────────
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

// ── KV: временное состояние медиагруппы ───────────────────────────────────────
export interface PendingMedia {
  audioFileId?:     string;
  thumbnailFileId?: string;
  title?:           string;
  artist?:          string | null;
  genre?:           string | null;
  duration?:        number;
  messageId?:       number;
}

// ── KV: состояние диалога admin-панели ────────────────────────────────────────
export interface AdminConvState {
  step:            'wait_audio' | 'wait_title' | 'wait_cover';
  audioFileId?:    string;
  audioDuration?:  number;
  audioMsgId?:     number;    // message_id аудио-сообщения в чате с ботом
  adminChatId?:    number;
  suggestedTitle?: string;    // имя файла без расширения
  title?:          string;    // финальное название трека
}

// ── Telegram Update ───────────────────────────────────────────────────────────
export interface TelegramUpdate {
  update_id:            number;
  message?:             Message;
  channel_post?:        ChannelPost;
  edited_channel_post?: ChannelPost;
  callback_query?:      CallbackQuery;
}

// Личное сообщение боту (команды + admin-диалог)
export interface Message {
  message_id: number;
  from?:      { id: number; is_bot: boolean; first_name?: string; username?: string };
  chat:       { id: number; type: string };
  date:       number;
  text?:      string;
  audio?:     TelegramAudio;
  document?:  TelegramDocument;
  photo?:     PhotoSize[];
  caption?:   string;
}

// Нажатие inline-кнопки
export interface CallbackQuery {
  id:       string;
  from:     { id: number; first_name: string; username?: string };
  message?: { chat: { id: number; type: string }; message_id: number };
  data?:    string;
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
  file_size?:     number;
  thumb?:         PhotoSize;
  thumbnail?:     PhotoSize;
  duration?:      number;   // если document — аудио
}

export interface PhotoSize {
  file_id:        string;
  file_unique_id: string;
  width:          number;
  height:         number;
  file_size?:     number;
}

export interface TelegramFileResponse {
  ok:           boolean;
  result?:      { file_path: string };
  description?: string;
}
