'use client';

import { useEffect } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready:       () => void;
        expand:      () => void;
        isExpanded:  boolean;
        themeParams: Record<string, string>;
        initDataUnsafe: {
          user?: TelegramUser;
        };
        HapticFeedback: {
          impactOccurred:     (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged:   () => void;
        };
        openLink: (url: string) => void;
      };
    };
  }
}

export function useTelegram() {
  const tg   = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const user = tg?.initDataUnsafe?.user ?? null;

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    if (!tg.isExpanded) tg.expand();
  }, [tg]);

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type);
  };

  /** Открывает ссылку через Telegram (если доступен) или в браузере */
  const openLink = (url: string) => {
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  return { tg, user, haptic, openLink };
}
