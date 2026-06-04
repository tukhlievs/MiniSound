'use client';

import { useState } from 'react';
import { Header }     from '@/components/layout/Header';
import { GenrePills } from '@/components/tracks/GenrePills';
import { TrackList }  from '@/components/tracks/TrackList';
import { useTracks }  from '@/hooks/useTracks';
import { useTelegram } from '@/hooks/useTelegram';
import { usePlayerStore } from '@/store/playerStore';

export default function HomePage() {
  const [genre, setGenre] = useState('all');
  const [query, setQuery] = useState('');

  const { data: tracks, isLoading, error } = useTracks(genre);
  const hasPlayer = usePlayerStore((s) => s.currentIndex >= 0);

  useTelegram();

  return (
    /* Единственный scroll-контейнер в приложении */
    <main
      className="h-dvh overflow-y-auto overscroll-none hide-scrollbar"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      <Header onSearch={setQuery} />

      {/* Контент начинается ниже фиксированного хедера */}
      <div
        style={{
          paddingTop:    'calc(60px + env(safe-area-inset-top, 0px) + 14px)',
          paddingBottom: hasPlayer
            ? 'calc(env(safe-area-inset-bottom, 0px) + 108px)'
            : 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
        }}
      >
        <div className="mb-4">
          <GenrePills selected={genre} onSelect={setGenre} />
        </div>

        <TrackList
          tracks={tracks}
          loading={isLoading}
          error={error}
          query={query}
          genre={genre}
        />
      </div>
    </main>
  );
}
