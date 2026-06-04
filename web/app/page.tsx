'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { GenrePills } from '@/components/tracks/GenrePills';
import { TrackList } from '@/components/tracks/TrackList';
import { useTracks } from '@/hooks/useTracks';
import { useTelegram } from '@/hooks/useTelegram';
import { usePlayerStore } from '@/store/playerStore';

export default function HomePage() {
  const [genre, setGenre] = useState('all');
  const [query, setQuery] = useState('');

  const { data: tracks, isLoading, error } = useTracks(genre);
  const isPlayerVisible = usePlayerStore((s) => s.currentIndex >= 0);

  // Инициализируем Telegram WebApp
  useTelegram();

  return (
    <main
      className="min-h-dvh overflow-y-auto hide-scrollbar"
      style={{
        paddingTop:    'calc(60px + env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: isPlayerVisible
          ? 'calc(env(safe-area-inset-bottom, 0px) + 110px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      <Header onSearch={setQuery} />

      {/* Жанровые пилюли */}
      <div className="mb-4">
        <GenrePills selected={genre} onSelect={setGenre} />
      </div>

      {/* Лента треков */}
      <TrackList
        tracks={tracks}
        loading={isLoading}
        error={error}
        query={query}
        genre={genre}
      />
    </main>
  );
}
