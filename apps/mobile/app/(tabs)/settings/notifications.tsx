import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Moon,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

interface NotificationPreferences {
  emailEnabled: boolean;
  emailDigest: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'NEVER';
  pushEnabled: boolean;
  pushSound: boolean;
  inAppEnabled: boolean;
  sessionStarted: boolean;
  sessionEnded: boolean;
  agentConnected: boolean;
  agentDisconnected: boolean;
  recordingReady: boolean;
  paymentReminders: boolean;
  productUpdates: boolean;
  weeklyReport: boolean;
  securityAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');

    if (status === 'granted') {
      // Update push enabled preference
      if (preferences) {
        updatePreference('pushEnabled', true);
      }
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
      } else {
        throw new Error(data.message || 'Failed to load preferences');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
        Alert.alert('Success', 'Notification preferences saved!');
      } else {
        throw new Error(data.message || 'Failed to save preferences');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Test notification sent! Check your notification center.');
      } else {
        throw new Error(data.message || 'Failed to send test notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  if (loading || !preferences) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#667eea" />
          <Text className="mt-4 text-slate-600 dark:text-slate-400">
            Loading preferences...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} className="text-slate-900 dark:text-white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Notifications
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 py-4 space-y-6">
          {/* Push Notification Permission */}
          {!hasPermission && (
            <View className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <View className="flex-row items-start gap-3 mb-3">
                <AlertCircle size={20} className="text-orange-600 dark:text-orange-400 mt-0.5" />
                <View className="flex-1">
                  <Text className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Enable Push Notifications
                  </Text>
                  <Text className="text-sm text-orange-700 dark:text-orange-300">
                    Grant permission to receive push notifications on this device
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={requestNotificationPermission}
                className="bg-orange-600 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">
                  Enable Notifications
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notification Channels */}
          <View className="bg-white dark:bg-slate-900 rounded-xl p-4">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Notification Channels
            </Text>

            <SettingToggle
              icon={Mail}
              label="Email Notifications"
              description="Receive notifications via email"
              value={preferences.emailEnabled}
              onValueChange={(value) => updatePreference('emailEnabled', value)}
            />

            {preferences.emailEnabled && (
              <View className="ml-10 mt-3 mb-3">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Frequency
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      onPress={() => updatePreference('emailDigest', freq)}
                      className={`px-4 py-2 rounded-lg border ${
                        preferences.emailDigest === freq
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-600'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          preferences.emailDigest === freq
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {freq.charAt(0) + freq.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <SettingToggle
              icon={Smartphone}
              label="Push Notifications"
              description="Receive push notifications on this device"
              value={preferences.pushEnabled && hasPermission}
              onValueChange={(value) => {
                if (value && !hasPermission) {
                  requestNotificationPermission();
                } else {
                  updatePreference('pushEnabled', value);
                }
              }}
            />

            {preferences.pushEnabled && hasPermission && (
              <View className="ml-10 mt-3 mb-3">
                <SettingToggle
                  icon={null}
                  label="Play Sound"
                  description="Play sound for push notifications"
                  value={preferences.pushSound}
                  onValueChange={(value) => updatePreference('pushSound', value)}
                />
              </View>
            )}

            <SettingToggle
              icon={Bell}
              label="In-App Notifications"
              description="Show notifications in the app"
              value={preferences.inAppEnabled}
              onValueChange={(value) => updatePreference('inAppEnabled', value)}
            />
          </View>

          {/* Notification Types */}
          <View className="bg-white dark:bg-slate-900 rounded-xl p-4">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Notification Types
            </Text>

            <SettingToggle
              label="Session Started"
              description="When a new coding session begins"
              value={preferences.sessionStarted}
              onValueChange={(value) => updatePreference('sessionStarted', value)}
            />

            <SettingToggle
              label="Session Ended"
              description="When a coding session is completed"
              value={preferences.sessionEnded}
              onValueChange={(value) => updatePreference('sessionEnded', value)}
            />

            <SettingToggle
              label="Agent Connected"
              description="When a desktop agent connects"
              value={preferences.agentConnected}
              onValueChange={(value) => updatePreference('agentConnected', value)}
            />

            <SettingToggle
              label="Agent Disconnected"
              description="When a desktop agent disconnects"
              value={preferences.agentDisconnected}
              onValueChange={(value) => updatePreference('agentDisconnected', value)}
            />

            <SettingToggle
              label="Recording Ready"
              description="When a recording is ready to view"
              value={preferences.recordingReady}
              onValueChange={(value) => updatePreference('recordingReady', value)}
            />

            <SettingToggle
              label="Payment Reminders"
              description="Billing and payment notifications"
              value={preferences.paymentReminders}
              onValueChange={(value) => updatePreference('paymentReminders', value)}
            />

            <SettingToggle
              label="Product Updates"
              description="New features and announcements"
              value={preferences.productUpdates}
              onValueChange={(value) => updatePreference('productUpdates', value)}
            />

            <SettingToggle
              label="Weekly Report"
              description="Weekly summary of your activity"
              value={preferences.weeklyReport}
              onValueChange={(value) => updatePreference('weeklyReport', value)}
            />

            <SettingToggle
              label="Security Alerts"
              description="Important security alerts (recommended)"
              value={preferences.securityAlerts}
              onValueChange={(value) => updatePreference('securityAlerts', value)}
              recommended
            />
          </View>

          {/* Quiet Hours */}
          <View className="bg-white dark:bg-slate-900 rounded-xl p-4">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Quiet Hours
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Pause non-urgent notifications during specific hours
            </Text>

            <SettingToggle
              icon={Moon}
              label="Enable Quiet Hours"
              description="Security alerts will still come through"
              value={preferences.quietHoursEnabled}
              onValueChange={(value) => updatePreference('quietHoursEnabled', value)}
            />
          </View>

          {/* Actions */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={savePreferences}
              disabled={saving}
              className={`bg-primary-600 py-4 rounded-xl ${saving ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-semibold text-center text-lg">
                {saving ? 'Saving...' : 'Save Preferences'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={sendTestNotification}
              className="bg-slate-200 dark:bg-slate-800 py-4 rounded-xl"
            >
              <Text className="text-slate-900 dark:text-white font-semibold text-center text-lg">
                Send Test Notification
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View className="h-8" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingToggleProps {
  icon?: any;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  recommended?: boolean;
}

function SettingToggle({
  icon: Icon,
  label,
  description,
  value,
  onValueChange,
  recommended,
}: SettingToggleProps) {
  return (
    <View className="flex-row items-start gap-3 py-3">
      {Icon && <Icon size={20} className="text-slate-600 dark:text-slate-400 mt-1" />}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-medium text-slate-900 dark:text-white">{label}</Text>
          {recommended && (
            <View className="bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">
              <Text className="text-xs font-medium text-primary-700 dark:text-primary-300">
                Recommended
              </Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: '#667eea' }}
        thumbColor={value ? '#ffffff' : '#f1f5f9'}
      />
    </View>
  );
}
