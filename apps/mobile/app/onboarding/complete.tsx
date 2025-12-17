import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function Complete() {
  const router = useRouter();

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Mark onboarding as complete
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600">
      <ScrollView className="flex-1" contentContainerClassName="p-6 justify-center">
        {/* Success Icon */}
        <View className="items-center mb-8">
          <Text className="text-8xl mb-4">🎉</Text>
          <Text className="text-4xl font-bold text-white text-center mb-3">
            All Set!
          </Text>
          <Text className="text-xl text-blue-100 text-center">
            You're ready to start coding with AI
          </Text>
        </View>

        {/* Feature Cards */}
        <View className="space-y-4 mb-8">
          <View className="bg-white/90 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-3xl mr-3">✓</Text>
              <Text className="text-lg font-semibold text-gray-900">
                Profile Setup Complete
              </Text>
            </View>
            <Text className="text-gray-600 ml-12">
              Your account is configured and ready
            </Text>
          </View>

          <View className="bg-white/90 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-3xl mr-3">🚀</Text>
              <Text className="text-lg font-semibold text-gray-900">
                Start Your First Session
              </Text>
            </View>
            <Text className="text-gray-600 ml-12">
              Create a project and start coding
            </Text>
          </View>

          <View className="bg-white/90 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-3xl mr-3">🎤</Text>
              <Text className="text-lg font-semibold text-gray-900">
                Use Voice Commands
              </Text>
            </View>
            <Text className="text-gray-600 ml-12">
              Control AI hands-free with your voice
            </Text>
          </View>
        </View>

        {/* Quick Tips */}
        <View className="bg-white/20 rounded-xl p-4 mb-8 border border-white/30">
          <Text className="text-white font-semibold mb-2">💡 Quick Tips:</Text>
          <Text className="text-white/90 text-sm mb-1">
            • Hold mic button to speak
          </Text>
          <Text className="text-white/90 text-sm mb-1">
            • Connect to desktop for full control
          </Text>
          <Text className="text-white/90 text-sm">
            • Enable notifications for updates
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handleContinue}
          className="bg-white py-5 rounded-xl shadow-2xl"
        >
          <Text className="text-blue-600 text-center font-bold text-lg">
            Go to Dashboard →
          </Text>
        </TouchableOpacity>

        {/* Help Link */}
        <TouchableOpacity className="mt-6">
          <Text className="text-white/80 text-center text-sm">
            Need help? View our getting started guide
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
