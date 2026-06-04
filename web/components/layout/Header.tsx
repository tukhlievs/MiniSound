'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';

interface HeaderProps {
  title?:      string;
  showSearch?: boolean;
  onSearch?:   (query: string) => void;
}

export function Header({ title = 'MiniSound', showSearch = false, onSearch }: HeaderProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');

  const closeSearch = () => { setOpen(false); setQuery(''); onSearch?.(''); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 glass"
      style={{
        height:       'calc(56px + env(safe-area-inset-top, 0px))',
        paddingTop:   'env(safe-area-inset-top, 0px)',
        borderBottom: '0.5px solid rgba(120,120,128,0.2)',
      }}
    >
      <div className="flex h-[56px] items-center px-4">

        {open && showSearch ? (
          <div className="flex w-full items-center gap-2 animate-fade-up">
            <Input
              autoFocus
              value={query}
              onChange={handleChange}
              placeholder="Поиск треков и исполнителей…"
              className="h-9 flex-1 border-0 bg-black/5 dark:bg-white/8 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
            />
            <button
              style={{ touchAction: 'manipulation' }}
              className="text-primary text-[15px] font-medium px-1 flex-shrink-0 active:opacity-60"
              onClick={closeSearch}
            >
              Отмена
            </button>
          </div>
        ) : (
          <>
            <div className="w-9 flex-shrink-0" />

            <div className="flex flex-1 items-center justify-center">
              <h1 className="font-display text-[18px] font-extrabold tracking-[-0.025em] text-foreground">
                {title}
              </h1>
            </div>

            {showSearch ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Поиск"
                className="h-9 w-9 flex-shrink-0 rounded-full text-muted-foreground hover:bg-black/5 dark:hover:bg-white/8"
                onClick={() => setOpen(true)}
              >
                <Search className="h-[17px] w-[17px]" aria-hidden />
              </Button>
            ) : (
              <div className="w-9 flex-shrink-0" />
            )}
          </>
        )}
      </div>
    </header>
  );
}
