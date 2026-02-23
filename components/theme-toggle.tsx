'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Initialize from localStorage or system preference
    const stored = window.localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
      setTheme(stored);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = prefersDark ? 'dark' : 'light';
    applyTheme(initial);
    setTheme(initial);
  }, []);

  const applyTheme = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem('theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-colors border"
      style={{ backgroundColor: 'var(--panel-border)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-4 h-4" />
          Dark
        </>
      ) : (
        <>
          <Sun className="w-4 h-4" />
          Light
        </>
      )}
    </button>
  );
}

