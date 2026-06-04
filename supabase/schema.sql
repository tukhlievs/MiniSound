-- MiniSound: схема базы данных Supabase
-- Выполни этот скрипт в SQL Editor своего Supabase проекта

CREATE TABLE IF NOT EXISTS public.tracks (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title            text        NOT NULL,
  artist           text,
  audio_file_id    text        NOT NULL UNIQUE,
  thumbnail_file_id text,
  duration         integer,     -- секунды
  genre            text,
  message_id       bigint,
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- Индексы
CREATE INDEX IF NOT EXISTS tracks_genre_idx      ON public.tracks (genre);
CREATE INDEX IF NOT EXISTS tracks_created_at_idx ON public.tracks (created_at DESC);

-- Row Level Security
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Все пользователи могут читать
CREATE POLICY "tracks_public_read" ON public.tracks
  FOR SELECT USING (true);

-- Только service_role может писать (CF Worker использует SUPABASE_SERVICE_KEY)
CREATE POLICY "tracks_service_insert" ON public.tracks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tracks_service_update" ON public.tracks
  FOR UPDATE USING (true) WITH CHECK (true);
