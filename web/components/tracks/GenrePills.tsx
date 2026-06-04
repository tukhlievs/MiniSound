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
                'flex-shrink-0 rounded-full px-[14px] py-[7px]',
                'text-[13px] font-medium leading-none',
                'transition-all duration-150 active:scale-[0.94]',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-black/[0.07] text-foreground hover:bg-black/[0.10]'
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
