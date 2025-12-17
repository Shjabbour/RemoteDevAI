import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Moon,
  Sun,
  Bell,
  Mic,
  Volume2,
  Smartphone,
  LogOut,
  User,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { useSettingsStore } from '@stores/settingsStore';
import { useAuthStore } from '@stores/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme,
    voiceEnabled,
    notificationsEnabled,
    hapticFeedbackEnabled,
    autoPlayVoice,
    setTheme,
    setVoiceEnabled,
    setNotificationsEnabled,
    setHapticFeedbackEnabled,
    setAutoPlayVoice,
  } = useSettingsStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const SettingItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    showChevron = false,
  }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between bg-dark-800 px-4 py-4 rounded-xl mb-2"
    >
      <View className="flex-row items-center flex-1">
        <View className="bg-dark-700 w-10 h-10 rounded-lg items-center justify-center mr-3">
          <Icon size={20} color="#64748b" />
        </View>
        <Text className="text-white text-base flex-1">{label}</Text>
      </View>
      {value !== undefined && typeof value === 'boolean' && (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#334155', true: '#3b82f6' }}
          thumbColor="#ffffff"
        />
      )}
      {value !== undefined && typeof value === 'string' && (
        <Text className="text-dark-400 text-sm mr-2">{value}</Text>
      )}
      {showChevron && <ChevronRight size={20} color="#64748b" />}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text className="text-dark-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
      {title}
    </Text>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-white text-2xl font-bold mb-2">Settings</Text>
          {user && (
            <View className="flex-row items-center">
              <View className="bg-primary-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Text className="text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-white font-semibold">{user.name}</Text>
                <Text className="text-dark-400 text-sm">{user.email}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => {
              const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
              const currentIndex = themes.indexOf(theme);
              const nextTheme = themes[(currentIndex + 1) % themes.length];
              setTheme(nextTheme);
            }}
            className="flex-row items-center justify-between bg-dark-800 px-4 py-4 rounded-xl"
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-dark-700 w-10 h-10 rounded-lg items-center justify-center mr-3">
                {theme === 'dark' ? (
                  <Moon size={20} color="#64748b" />
                ) : (
                  <Sun size={20} color="#64748b" />
                )}
              </View>
              <Text className="text-white text-base flex-1">Theme</Text>
            </View>
            <Text className="text-dark-400 text-sm mr-2 capitalize">{theme}</Text>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Voice & Audio */}
        <SectionHeader title="Voice & Audio" />
        <View className="mb-6">
          <SettingItem
            icon={Mic}
            label="Voice Input"
            value={voiceEnabled}
            onPress={setVoiceEnabled}
          />
          <SettingItem
            icon={Volume2}
            label="Auto-play Voice Messages"
            value={autoPlayVoice}
            onPress={setAutoPlayVoice}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View className="mb-6">
          <SettingItem
            icon={Bell}
            label="Push Notifications"
            value={notificationsEnabled}
            onPress={setNotificationsEnabled}
          />
        </View>

        {/* Accessibility */}
        <SectionHeader title="Accessibility" />
        <View className="mb-6">
          <SettingItem
            icon={Smartphone}
            label="Haptic Feedback"
            value={hapticFeedbackEnabled}
            onPress={setHapticFeedbackEnabled}
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View className="mb-6">
          <SettingItem icon={Info} label="App Version" value="1.0.0" showChevron />
          <SettingItem
            icon={Info}
            label="Terms & Privacy"
            onPress={() => {}}
            showChevron
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-center bg-red-500/10 px-4 py-4 rounded-xl mb-8"
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-500 font-semibold text-base ml-2">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
