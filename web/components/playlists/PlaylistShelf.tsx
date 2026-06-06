'use client';

import { memo } from 'react';
import { Play, ListMusic } from 'lucide-react';
import { cn, trackGradient } from '@/lib/utils';
import { thumbnailUrl } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { Playlist } from '@/lib/playlists';

// Обложка плейлиста: коллаж 2×2 из обложек треков, одна обложка, или градиент.
function Cover({ playlist }: { playlist: Playlist }) {
  const thumbs = playlist.tracks
    .filter((t) => t.thumbnail_file_id)
    .slice(0, 4)
    .map((t) => t.thumbnail_file_id as string);

  if (thumbs.length >= 4) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2">
        {thumbs.map((id, i) => (
          <img key={i} src={thumbnailUrl(id)} alt="" draggable={false}
               className="h-full w-full object-cover" />
        ))}
      </div>
    );
  }
  if (thumbs.length >= 1) {
    return <img src={thumbnailUrl(thumbs[0])} alt="" draggable={false}
                className="h-full w-full object-cover" />;
  }
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', trackGradient(playlist.id))}>
      <ListMusic className="h-8 w-8 text-white/60" aria-hidden />
    </div>
  );
}

const PlaylistCard = memo(function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const playTrack  = usePlayerStore((s) => s.playTrack);
  const { haptic } = useTelegram();

  return (
    <button
      aria-label={`Воспроизвести плейлист ${playlist.title}`}
      style={{ touchAction: 'manipulation' }}
      onClick={() => { haptic('medium'); playTrack(playlist.tracks[0], playlist.tracks); }}
      className="group w-[158px] flex-shrink-0 select-none text-left
                 transition-transform duration-150 active:scale-[0.96]"
    >
      <div className="ms-depth relative aspect-square w-full overflow-hidden rounded-[18px]">
        <Cover playlist={playlist} />
        {/* Затемнение снизу под кнопку play */}
        <div className="pointer-events-none absolute inset-0"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 55%)' }} />
        <div className="ms-depth-btn absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full">
          <Play className="ml-0.5 h-[18px] w-[18px] fill-black text-black" aria-hidden />
        </div>
      </div>

      <p className="mt-2.5 truncate text-[13.5px] font-semibold leading-tight text-foreground">
        {playlist.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
        {playlist.subtitle}
      </p>
    </button>
  );
});

export function PlaylistShelf({ playlists }: { playlists: Playlist[] }) {
  if (!playlists.length) return null;

  return (
    <section className="mb-7">
      <h2 className="mb-3 px-4 text-[17px] font-bold tracking-tight text-foreground">
        Сделано для тебя
      </h2>
      <div className="flex gap-4 overflow-x-auto px-4 pb-1 hide-scrollbar">
        {playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
      </div>
    </section>
  );
}
