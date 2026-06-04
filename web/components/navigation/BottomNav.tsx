'use client';

import { ListMusic, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/useTelegram';

export type NavTab = 'general' | 'search' | 'settings';

interface BottomNavProps {
  active:   NavTab;
  onChange: (tab: NavTab) => void;
}

const TABS: { id: NavTab; label: string; Icon: React.ElementType }[] = [
  { id: 'general',  label: 'General',  Icon: ListMusic },
  { id: 'search',   label: 'Search',   Icon: Search    },
  { id: 'settings', label: 'Settings', Icon: Settings  },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  const { haptic } = useTelegram();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed left-4 right-4 z-50"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div
        className="flex items-center rounded-full px-2 py-1.5"
        style={{
          background: '#111111',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)',
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => { haptic('light'); onChange(id); }}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'flex-1 flex flex-col items-center gap-[3px] py-2 rounded-full',
                'transition-all duration-200 active:scale-[0.91]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                isActive ? 'bg-white/[0.08]' : '',
              )}
            >
              <Icon
                className={cn(
                  'h-[22px] w-[22px] transition-colors duration-200',
                  isActive ? 'text-white' : 'text-white/35',
                )}
                strokeWidth={isActive ? 2.2 : 1.7}
                aria-hidden
              />
              <span className={cn(
                'text-[10px] font-medium leading-none transition-colors duration-200',
                isActive ? 'text-white' : 'text-white/35',
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
