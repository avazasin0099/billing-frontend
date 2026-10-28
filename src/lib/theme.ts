// Theme management — light is the default; dark is an opt-in toggle.
// Persisted to localStorage under `billpro_theme`.

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'billpro_theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'light';
}

/** Does the given theme resolve to dark right now? */
export function resolvesToDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Apply a theme to <html> and persist the choice. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolvesToDark(theme));
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}

/** Run once on boot — applies the stored theme (default light) with no flash. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
