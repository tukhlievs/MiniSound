import type { Metadata, Viewport } from 'next';
import { Inter, Syne } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AudioController } from '@/components/player/AudioController';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullPlayer } from '@/components/player/FullPlayer';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const metadata: Metadata = {
  title:       'MiniSound',
  description: 'Аудио-стриминг площадка в Telegram',
  // Убираем стандартный favicon чтобы не светить лишними запросами в Mini App
};

export const viewport: Viewport = {
  width:            'device-width',
  initialScale:     1,
  maximumScale:     1,
  userScalable:     false,
  viewportFit:      'cover',
  themeColor:       '#0B0B0C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${syne.variable}`}>
      {/* Подключаем Telegram WebApp SDK */}
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="min-h-dvh overflow-x-hidden">
        <Providers>
          {/* vaul требует data-vaul-drawer-wrapper на обёртке */}
          <div data-vaul-drawer-wrapper="" className="min-h-dvh bg-background">
            {children}
          </div>

          {/* Глобальные плееры — монтируются один раз поверх всего */}
          <AudioController />
          <MiniPlayer />
          <FullPlayer />
        </Providers>
      </body>
    </html>
  );
}
