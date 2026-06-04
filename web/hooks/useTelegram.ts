'use client';

import { useEffect } from 'react';

// Минимальные типы Telegram WebApp — не требует внешнего пакета
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready:       () => void;
        expand:      () => void;
        isExpanded:  boolean;
        themeParams: Record<string, string>;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    if (!tg.isExpanded) tg.expand();
  }, [tg]);

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type);
  };

  return { tg, haptic };
}
