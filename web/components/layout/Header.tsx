'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';

interface HeaderProps {
  onSearch: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]           = useState('');

  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    onSearch('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 glass"
      style={{
        height:     'calc(60px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="flex h-[60px] items-center px-4">

        {searchOpen ? (
          /* ── Режим поиска ── */
          <div className="flex w-full items-center gap-2 animate-fade-up">
            <Input
              autoFocus
              value={query}
              onChange={handleChange}
              placeholder="Поиск треков и исполнителей…"
              className="h-9 flex-1 bg-white/5 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={closeSearch}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          /* ── Обычный режим ── */
          <>
            {/* Балансирующий спейсер */}
            <div className="w-9 flex-shrink-0" />

            {/* Логотип строго по центру */}
            <div className="flex flex-1 items-center justify-center">
              <h1 className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-foreground">
                MiniSound
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0 rounded-full bg-white/5"
              onClick={openSearch}
            >
              <Search className="h-[15px] w-[15px] text-muted-foreground" />
            </Button>
          </>
        )}
      </div>

      {/* Тонкая декоративная линия под хедером */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(94,129,255,0.25) 30%, rgba(94,129,255,0.25) 70%, transparent)',
        }}
      />
    </header>
  );
}
