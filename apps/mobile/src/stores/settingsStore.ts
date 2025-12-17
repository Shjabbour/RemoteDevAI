import { create } from 'zustand';
import { Settings } from '@types/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsStore extends Settings {
  setTheme: (theme: Settings['theme']) => Promise<void>;
  setVoiceEnabled: (enabled: boolean) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setHapticFeedbackEnabled: (enabled: boolean) => Promise<void>;
  setAutoPlayVoice: (enabled: boolean) => Promise<void>;
  setRecordingQuality: (quality: Settings['recordingQuality']) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  initialize: () => Promise<void>;
  reset: () => Promise<void>;
}

const SETTINGS_KEY = 'app_settings';

const defaultSettings: Settings = {
  theme: 'auto',
  voiceEnabled: true,
  notificationsEnabled: true,
  hapticFeedbackEnabled: true,
  autoPlayVoice: false,
  recordingQuality: 'medium',
  language: 'en',
};

const saveSettings = async (settings: Settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  setTheme: async (theme) => {
    set({ theme });
    await saveSettings(get());
  },

  setVoiceEnabled: async (voiceEnabled) => {
    set({ voiceEnabled });
    await saveSettings(get());
  },

  setNotificationsEnabled: async (notificationsEnabled) => {
    set({ notificationsEnabled });
    await saveSettings(get());
  },

  setHapticFeedbackEnabled: async (hapticFeedbackEnabled) => {
    set({ hapticFeedbackEnabled });
    await saveSettings(get());
  },

  setAutoPlayVoice: async (autoPlayVoice) => {
    set({ autoPlayVoice });
    await saveSettings(get());
  },

  setRecordingQuality: async (recordingQuality) => {
    set({ recordingQuality });
    await saveSettings(get());
  },

  setLanguage: async (language) => {
    set({ language });
    await saveSettings(get());
  },

  initialize: async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        set(settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  reset: async () => {
    set(defaultSettings);
    await saveSettings(defaultSettings);
  },
}));
