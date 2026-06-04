'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onSearch: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      setQuery('');
      onSearch('');
    } else {
      setOpen(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 flex items-center px-4 transition-all duration-300',
        'glass border-b border-white/6'
      )}
      style={{
        height: '60px',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {open ? (
        /* Режим поиска */
        <div className="flex items-center gap-2 w-full animate-fade-up">
          <Input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Поиск треков и исполнителей..."
            className="flex-1 h-9 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleToggle}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        /* Обычный режим */
        <>
          {/* Левый спейсер (равен ширине кнопки поиска) */}
          <div className="w-9" />

          {/* Логотип по центру */}
          <h1 className="flex-1 text-center font-display text-[17px] font-extrabold tracking-tight text-white">
            MiniSound
          </h1>

          {/* Кнопка поиска */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/6"
            onClick={handleToggle}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
        </>
      )}
    </header>
  );
}
