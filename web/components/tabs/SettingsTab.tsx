'use client';

import {
  ChevronRight,
  Globe,
  Headphones,
  Users,
  Moon,
  Sun,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useTelegram } from '@/hooks/useTelegram';

/* ── iOS Settings Row ─────────────────────────────────────── */
interface SettingsRowProps {
  iconBg:   string;
  icon:     React.ReactNode;
  label:    string;
  value?:   string;
  onTap?:   () => void;
  right?:   React.ReactNode;  // кастомный элемент справа
  isLast?:  boolean;
}

function SettingsRow({ iconBg, icon, label, value, onTap, right, isLast }: SettingsRowProps) {
  return (
    <>
      <button
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3',
          'transition-opacity duration-100 active:opacity-55',
          onTap ? 'cursor-pointer' : 'cursor-default',
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={onTap}
        disabled={!onTap && !right}
      >
        {/* Цветная иконка */}
        <div className={cn('w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>

        {/* Лейбл */}
        <span className="flex-1 text-left text-[15px] text-foreground">{label}</span>

        {/* Правая часть */}
        {right ?? (
          <>
            {value && <span className="text-[14px] text-muted-foreground mr-1">{value}</span>}
            {onTap && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          </>
        )}
      </button>

      {/* Разделитель (кроме последней строки) */}
      {!isLast && (
        <div className="h-px bg-border ml-[56px]" />
      )}
    </>
  );
}

/* ── Секционный заголовок ─────────────────────────────────── */
function SectionTitle({ children }: { children: string }) {
  return (
    <p className="px-5 pb-1 pt-5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/* ── Группа строк ────────────────────────────────────────── */
function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 rounded-2xl bg-card overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      {children}
    </div>
  );
}

/* ── Сегментный переключатель темы ────────────────────────── */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className="flex gap-1 rounded-lg p-1 mr-1"
      style={{ background: 'rgba(120,120,128,0.16)' }}
    >
      {(['light', 'dark'] as const).map((t) => {
        const isActive = theme === t;
        return (
          <button
            key={t}
            onClick={(e) => { e.stopPropagation(); setTheme(t); }}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md',
              'text-[12px] font-medium transition-all duration-200',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {t === 'light'
              ? <Sun  className="h-3 w-3" />
              : <Moon className="h-3 w-3" />}
            {t === 'light' ? 'Свет' : 'Тёмная'}
          </button>
        );
      })}
    </div>
  );
}

/* ── Главный компонент ───────────────────────────────────── */
export function SettingsTab() {
  const { user, openLink } = useTelegram();

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-8">

      {/* ── Профиль Telegram ── */}
      {user ? (
        <div className="mx-4 mt-3 mb-1">
          <div
            className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-card"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
          >
            {/* Аватар */}
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.first_name}
                className="w-[60px] h-[60px] rounded-full flex-shrink-0 object-cover"
              />
            ) : (
              <div
                className="w-[60px] h-[60px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
                style={{ background: '#007AFF' }}
              >
                {user.first_name[0]}
              </div>
            )}

            {/* Инфо */}
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold text-foreground truncate">
                {user.first_name}{user.last_name ? ` ${user.last_name}` : ''}
              </p>
              {user.username && (
                <p className="text-[14px] text-muted-foreground mt-0.5">
                  @{user.username}
                </p>
              )}
              {user.username && (
                <button
                  onClick={() => openLink(`https://t.me/${user.username}`)}
                  style={{ touchAction: 'manipulation' }}
                  className="flex items-center gap-1 mt-1 active:opacity-60"
                >
                  <span className="text-[13px] text-primary">t.me/{user.username}</span>
                  <ExternalLink className="h-3 w-3 text-primary" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Если не в Telegram — заглушка */
        <div className="mx-4 mt-3 mb-1 px-4 py-4 rounded-2xl bg-card text-center"
             style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <p className="text-[15px] text-muted-foreground">Откройте приложение в Telegram</p>
        </div>
      )}

      {/* ── Внешний вид ── */}
      <SectionTitle>Внешний вид</SectionTitle>
      <Group>
        <SettingsRow
          iconBg="bg-[#5E5CE6]"
          icon={<Moon className="h-[18px] w-[18px] text-white" />}
          label="Тема"
          isLast
          right={<ThemeToggle />}
        />
      </Group>

      {/* ── Язык ── */}
      <SectionTitle>Язык</SectionTitle>
      <Group>
        <SettingsRow
          iconBg="bg-[#FF9500]"
          icon={<Globe className="h-[18px] w-[18px] text-white" />}
          label="Язык"
          value="Русский"
          isLast
        />
      </Group>

      {/* ── Контакты ── */}
      <SectionTitle>Контакты</SectionTitle>
      <Group>
        <SettingsRow
          iconBg="bg-[#007AFF]"
          icon={<Headphones className="h-[18px] w-[18px] text-white" />}
          label="Поддержка"
          value="@imnotsheikh"
          onTap={() => openLink('https://t.me/imnotsheikh')}
        />
        <SettingsRow
          iconBg="bg-[#34C759]"
          icon={<Users className="h-[18px] w-[18px] text-white" />}
          label="Сообщество"
          value="@skenvco"
          onTap={() => openLink('https://t.me/skenvco')}
          isLast
        />
      </Group>

    </div>
  );
}
