import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

export default function Step2() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    setLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        router.push('/onboarding/step-3');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/step-3');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Progress */}
        <View className="flex-row mb-8">
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              className={`flex-1 h-1 mx-1 rounded ${
                step <= 2 ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>

        {/* Icon */}
        <View className="items-center mb-6">
          <Text className="text-6xl mb-4">🔔</Text>
        </View>

        {/* Content */}
        <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Enable Notifications
        </Text>
        <Text className="text-lg text-gray-600 mb-8 text-center">
          Stay updated on your coding sessions and AI responses
        </Text>

        {/* Benefits */}
        <View className="bg-blue-50 rounded-lg p-4 mb-8 border border-blue-200">
          <Text className="font-semibold text-blue-900 mb-2">
            You'll be notified about:
          </Text>
          <Text className="text-blue-700 mb-1">• Session status updates</Text>
          <Text className="text-blue-700 mb-1">• AI code completions</Text>
          <Text className="text-blue-700 mb-1">• Desktop agent connections</Text>
          <Text className="text-blue-700">• Important system alerts</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={requestPermissions}
          disabled={loading}
          className="bg-blue-600 py-4 rounded-lg mb-3"
        >
          <Text className="text-white text-center font-semibold text-base">
            {loading ? 'Requesting...' : 'Enable Notifications'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-gray-600 text-center font-medium">
            Skip for now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
