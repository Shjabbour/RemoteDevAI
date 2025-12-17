import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@stores/authStore';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 1000);
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View className="flex-1 bg-dark-900 items-center justify-center">
      <View className="items-center">
        <View className="w-24 h-24 bg-primary-600 rounded-3xl items-center justify-center mb-6">
          <Text className="text-white text-4xl font-bold">R</Text>
        </View>
        <Text className="text-white text-3xl font-bold mb-2">RemoteDevAI</Text>
        <Text className="text-dark-400 text-base mb-8">
          AI-Powered Remote Development
        </Text>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    </View>
  );
}
