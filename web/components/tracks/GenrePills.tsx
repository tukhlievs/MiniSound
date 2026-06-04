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
      <div className="flex gap-2 px-4 pb-1">
        {GENRES.map((g) => {
          const active = g.id === selected;
          return (
            <button
              key={g.id}
              onClick={() => { haptic('light'); onSelect(g.id); }}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium',
                'transition-all duration-200 active:scale-95',
                active
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-white/7 text-muted-foreground border border-white/8 hover:bg-white/10'
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="hidden" />
    </ScrollArea>
  );
}
