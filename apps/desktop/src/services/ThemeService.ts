import { nativeTheme, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { createLogger } from '../utils/logger';

const logger = createLogger('ThemeService');

interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
}

export class ThemeService {
  private store: Store<ThemeSettings>;
  private windows: Set<BrowserWindow> = new Set();

  constructor() {
    this.store = new Store<ThemeSettings>({
      defaults: {
        theme: 'system',
      },
    });

    // Initialize theme
    this.applyTheme(this.getTheme());

    // Listen for system theme changes
    nativeTheme.on('updated', () => {
      if (this.getTheme() === 'system') {
        this.notifyRenderers();
      }
    });
  }

  /**
   * Register a window to receive theme updates
   */
  registerWindow(window: BrowserWindow): void {
    this.windows.add(window);

    // Remove from set when window is closed
    window.on('closed', () => {
      this.windows.delete(window);
    });
  }

  /**
   * Get the current theme preference
   */
  getTheme(): 'light' | 'dark' | 'system' {
    return this.store.get('theme');
  }

  /**
   * Get the effective theme (resolves 'system' to actual theme)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    const theme = this.getTheme();
    if (theme === 'system') {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    }
    return theme;
  }

  /**
   * Set the theme preference
   */
  setTheme(theme: 'light' | 'dark' | 'system'): void {
    logger.info(`Setting theme to: ${theme}`);
    this.store.set('theme', theme);
    this.applyTheme(theme);
    this.notifyRenderers();
  }

  /**
   * Apply the theme to Electron's nativeTheme
   */
  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    nativeTheme.themeSource = theme;
  }

  /**
   * Notify all renderer processes about theme changes
   */
  private notifyRenderers(): void {
    const effectiveTheme = this.getEffectiveTheme();

    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('theme-changed', {
          theme: this.getTheme(),
          effectiveTheme,
          isDark: effectiveTheme === 'dark',
        });
      }
    });
  }

  /**
   * Get theme data for renderer
   */
  getThemeData() {
    const effectiveTheme = this.getEffectiveTheme();
    return {
      theme: this.getTheme(),
      effectiveTheme,
      isDark: effectiveTheme === 'dark',
    };
  }

  /**
   * Get system theme preference
   */
  getSystemTheme(): 'light' | 'dark' {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
}
