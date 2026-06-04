export interface Track {
  id: string;
  title: string;
  artist: string | null;
  audio_file_id: string;
  thumbnail_file_id: string | null;
  duration: number | null;
  genre: string | null;
  message_id: number | null;
  created_at: string;
}

export interface GenreOption {
  id: string;
  label: string;
}

export const GENRES: GenreOption[] = [
  { id: 'all',        label: 'Все'        },
  { id: 'pop',        label: 'Pop'        },
  { id: 'rock',       label: 'Rock'       },
  { id: 'hip-hop',    label: 'Hip-Hop'    },
  { id: 'electronic', label: 'Electronic' },
  { id: 'classical',  label: 'Classical'  },
  { id: 'jazz',       label: 'Jazz'       },
  { id: 'lofi',       label: 'Lo-Fi'      },
  { id: 'rnb',        label: 'R&B'        },
];
