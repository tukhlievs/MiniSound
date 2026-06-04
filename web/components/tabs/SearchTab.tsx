'use client';

import { Search } from 'lucide-react';

export function SearchTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div
        className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6"
        style={{ background: 'rgba(0,122,255,0.12)' }}
      >
        <Search className="h-9 w-9 text-primary" />
      </div>
      <p className="text-[20px] font-bold text-foreground leading-tight">
        Поиск
      </p>
      <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">
        Умный поиск треков и исполнителей скоро появится здесь
      </p>
    </div>
  );
}
