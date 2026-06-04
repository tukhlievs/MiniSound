'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { GENRES } from '@/types';
import { useTelegram } from '@/hooks/useTelegram';

interface GenrePillsProps {
  selected: string;
  onSelect: (genre: string) => void;
}

export function GenrePills({ selected, onSelect }: GenrePillsProps) {
  const { haptic } = useTelegram();

  return (
    <ScrollArea className="w-full" type="scroll">
      <div className="flex gap-2 px-4 pb-1 pt-0.5">
        {GENRES.map((g) => {
          const active = g.id === selected;
          return (
            <button
              key={g.id}
              onClick={() => { haptic('light'); onSelect(g.id); }}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-[7px]',
                'text-[13px] font-medium leading-none',
                'transition-all duration-200',
                'active:scale-[0.93]',
                active
                  ? [
                      'bg-primary text-white',
                      'shadow-md shadow-primary/30',
                    ]
                  : [
                      'bg-white/[0.06] text-muted-foreground',
                      'border border-white/[0.07]',
                      'hover:bg-white/[0.10] hover:text-foreground',
                    ]
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      {/* Скрываем скроллбар */}
      <ScrollBar orientation="horizontal" className="hidden" />
    </ScrollArea>
  );
}
