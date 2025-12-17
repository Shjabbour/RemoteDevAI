import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors, ColorScheme, Colors } from './colors';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const { theme: themePreference } = useSettingsStore();

  // Determine the active theme based on user preference
  const getActiveTheme = (): ColorScheme => {
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    // Auto mode - use system preference
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  };

  const activeTheme = getActiveTheme();
  const isDark = activeTheme === 'dark';
  const themeColors: Colors = colors[activeTheme];

  return {
    theme: activeTheme,
    isDark,
    colors: themeColors,
  };
}

export default useTheme;
