'use client';

import { useState } from 'react';
import { Header }      from '@/components/layout/Header';
import { TrackList }   from '@/components/tracks/TrackList';
import { BottomNav, type NavTab } from '@/components/navigation/BottomNav';
import { PlaylistShelf } from '@/components/playlists/PlaylistShelf';
import { SearchTab }   from '@/components/tabs/SearchTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { useTracks }    from '@/hooks/useTracks';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useTelegram }  from '@/hooks/useTelegram';
import { usePlayerStore } from '@/store/playerStore';

/* Высота навбара + зазор */
const NAV_H = 88;

export default function HomePage() {
  const [tab, setTab]     = useState<NavTab>('general');
  const [query, setQuery] = useState('');

  const { data: tracks, isLoading, error } = useTracks();
  const playlists = usePlaylists(tracks);
  const hasPlayer = usePlayerStore((s) => s.currentIndex >= 0);

  useTelegram();

  // Полку плейлистов показываем только на чистой главной (без поиска)
  const showShelf = tab === 'general' && !query;

  /* Отступ снизу = навбар + возможный мини-плеер */
  const paddingBottom = `calc(${NAV_H}px + ${hasPlayer ? 72 + 16 : 0}px + env(safe-area-inset-bottom, 0px) + 16px)`;

  return (
    <>
      {/* Хедер — меняет заголовок и показывает поиск только на General */}
      <Header
        title={tab === 'general' ? 'MiniSound' : tab === 'search' ? 'Поиск' : 'Настройки'}
        showSearch={tab === 'general'}
        onSearch={setQuery}
      />

      {/* Основная область */}
      <main
        className="h-dvh overflow-y-auto overscroll-none hide-scrollbar"
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top, 0px) + 16px)',
          paddingBottom,
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {tab === 'general' && (
          <>
            {/* Авто-плейлисты на основе прослушиваний */}
            {showShelf && <PlaylistShelf playlists={playlists} />}

            <TrackList
              tracks={tracks}
              loading={isLoading}
              error={error}
              query={query}
              genre="all"
            />
          </>
        )}

        {tab === 'search' && <SearchTab />}

        {tab === 'settings' && <SettingsTab />}
      </main>

      {/* Нижний навигационный бар-пилюля */}
      <BottomNav active={tab} onChange={setTab} />
    </>
  );
}
