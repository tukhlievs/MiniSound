import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Mono, Syne } from 'next/font/google';
import './globals.css';
import { Providers }      from './providers';
import { AudioController } from '@/components/player/AudioController';
import { MiniPlayer }      from '@/components/player/MiniPlayer';
import { FullPlayer }      from '@/components/player/FullPlayer';

const dmSans = DM_Sans({
  subsets:  ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
  display:  'swap',
});

const dmMono = DM_Mono({
  subsets:  ['latin'],
  weight:   ['400', '500'],
  variable: '--font-dm-mono',
  display:  'swap',
});

const syne = Syne({
  subsets:  ['latin'],
  weight:   ['700', '800'],
  variable: '--font-syne',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'MiniSound',
  description: 'Аудио-стриминг площадка в Telegram',
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit:  'cover',
  themeColor:   '#060A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${dmSans.variable} ${dmMono.variable} ${syne.variable}`}
    >
      <head>
        {/* Telegram WebApp SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>

      {/* overflow:hidden + height:100dvh → никакого скролла на уровне body */}
      <body className="h-dvh overflow-hidden">
        <Providers>
          {/* vaul требует data-vaul-drawer-wrapper */}
          <div
            data-vaul-drawer-wrapper=""
            className="h-dvh overflow-hidden bg-background"
          >
            {children}
          </div>

          {/* Глобальные плееры монтируются один раз */}
          <AudioController />
          <MiniPlayer />
          <FullPlayer />
        </Providers>
      </body>
    </html>
  );
}
