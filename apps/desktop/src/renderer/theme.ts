export interface ThemeData {
  theme: 'light' | 'dark' | 'system';
  effectiveTheme: 'light' | 'dark';
  isDark: boolean;
}

export const colors = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#a855f7',
    secondaryForeground: '#ffffff',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  dark: {
    background: '#0f172a',
    foreground: '#f8fafc',
    card: '#1e293b',
    cardBorder: '#334155',
    primary: '#60a5fa',
    primaryForeground: '#0f172a',
    secondary: '#c084fc',
    secondaryForeground: '#f8fafc',
    muted: '#334155',
    mutedForeground: '#cbd5e1',
    border: '#334155',
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#60a5fa',
    },
  },
};

/**
 * Apply theme to the document
 */
export function applyTheme(themeData: ThemeData): void {
  const { effectiveTheme } = themeData;

  // Update document class
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Update color scheme
  document.documentElement.style.colorScheme = effectiveTheme;

  // Apply CSS variables
  const themeColors = colors[effectiveTheme];
  const root = document.documentElement;

  root.style.setProperty('--color-background', themeColors.background);
  root.style.setProperty('--color-foreground', themeColors.foreground);
  root.style.setProperty('--color-card', themeColors.card);
  root.style.setProperty('--color-card-border', themeColors.cardBorder);
  root.style.setProperty('--color-primary', themeColors.primary);
  root.style.setProperty('--color-primary-foreground', themeColors.primaryForeground);
  root.style.setProperty('--color-secondary', themeColors.secondary);
  root.style.setProperty('--color-secondary-foreground', themeColors.secondaryForeground);
  root.style.setProperty('--color-muted', themeColors.muted);
  root.style.setProperty('--color-muted-foreground', themeColors.mutedForeground);
  root.style.setProperty('--color-border', themeColors.border);
  root.style.setProperty('--color-text-primary', themeColors.text.primary);
  root.style.setProperty('--color-text-secondary', themeColors.text.secondary);
  root.style.setProperty('--color-text-muted', themeColors.text.muted);
}

/**
 * Get current theme colors
 */
export function getThemeColors(isDark: boolean) {
  return isDark ? colors.dark : colors.light;
}

/**
 * Initialize theme listener
 */
export function initThemeListener(callback: (themeData: ThemeData) => void): () => void {
  const handler = (_event: any, themeData: ThemeData) => {
    applyTheme(themeData);
    callback(themeData);
  };

  // Listen for theme changes from main process
  if (window.electron) {
    window.electron.ipcRenderer.on('theme-changed', handler);

    // Request initial theme
    window.electron.ipcRenderer.invoke('get-theme').then((themeData: ThemeData) => {
      applyTheme(themeData);
      callback(themeData);
    });
  }

  // Return cleanup function
  return () => {
    if (window.electron) {
      window.electron.ipcRenderer.removeListener('theme-changed', handler);
    }
  };
}
