import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function Step4() {
  const router = useRouter();
  const [tested, setTested] = useState(false);

  const handleTestVoice = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTested(true);
    // TODO: Implement actual voice test
  };

  const handleComplete = () => {
    router.push('/onboarding/complete');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Progress */}
        <View className="flex-row mb-8">
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              className="flex-1 h-1 mx-1 rounded bg-blue-600"
            />
          ))}
        </View>

        {/* Icon */}
        <View className="items-center mb-6">
          <Text className="text-6xl mb-4">🎤</Text>
        </View>

        {/* Content */}
        <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Voice Input Tutorial
        </Text>
        <Text className="text-lg text-gray-600 mb-8 text-center">
          Learn how to control AI with your voice
        </Text>

        {/* Tutorial Steps */}
        <View className="space-y-4 mb-8">
          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <Text className="font-semibold text-blue-900 mb-2">
              1. Press and Hold
            </Text>
            <Text className="text-blue-700 text-sm">
              Press and hold the microphone button while speaking
            </Text>
          </View>

          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <Text className="font-semibold text-blue-900 mb-2">
              2. Give Commands
            </Text>
            <Text className="text-blue-700 text-sm">
              Try: "Create a new React component" or "Explain this code"
            </Text>
          </View>

          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <Text className="font-semibold text-blue-900 mb-2">
              3. Release to Send
            </Text>
            <Text className="text-blue-700 text-sm">
              Release the button when done speaking
            </Text>
          </View>
        </View>

        {/* Test Button */}
        <TouchableOpacity
          onPress={handleTestVoice}
          className={`py-4 rounded-lg mb-4 border-2 ${
            tested
              ? 'bg-green-50 border-green-500'
              : 'bg-blue-600 border-blue-600'
          }`}
        >
          <Text className={`text-center font-semibold text-base ${
            tested ? 'text-green-700' : 'text-white'
          }`}>
            {tested ? '✓ Voice Test Complete' : '🎤 Test Voice Input'}
          </Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleComplete}
          className="bg-blue-600 py-4 rounded-lg"
        >
          <Text className="text-white text-center font-semibold text-base">
            {tested ? 'Complete Setup' : 'Skip Tutorial'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
