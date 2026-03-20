import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="p-2 rounded-lg text-fg-muted hover:bg-bg-hover hover:text-fg-primary transition-colors"
    >
      {isDark
        ? <SunIcon className="w-5 h-5" />
        : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
