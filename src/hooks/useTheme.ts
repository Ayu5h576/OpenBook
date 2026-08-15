import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';

const STORAGE_KEY = 'openbook_theme';

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove('dark', 'sepia');
  if (theme === 'dark') html.classList.add('dark');
  if (theme === 'sepia') html.classList.add('sepia');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? 'light';
  });

  // Apply on mount + whenever theme changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const toggleDark = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleDark };
}
