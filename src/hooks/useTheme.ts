import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pastita-theme';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Theme;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const resolvedTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme: theme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    toggle: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    mounted,
  };
}
