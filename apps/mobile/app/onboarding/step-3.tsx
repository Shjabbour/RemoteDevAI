import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step3() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!code) return;
    setLoading(true);
    try {
      // TODO: Call API to verify connection code
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push('/onboarding/step-4');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/step-4');
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
                step <= 3 ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>

        {/* Icon */}
        <View className="items-center mb-6">
          <Text className="text-6xl mb-4">💻</Text>
        </View>

        {/* Content */}
        <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Connect to Desktop
        </Text>
        <Text className="text-lg text-gray-600 mb-8 text-center">
          Enter the connection code from your desktop agent
        </Text>

        {/* Instructions */}
        <View className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-2">
            How to connect:
          </Text>
          <Text className="text-gray-700 text-sm mb-1">
            1. Open RemoteDevAI Desktop Agent
          </Text>
          <Text className="text-gray-700 text-sm mb-1">
            2. Click "Connect Mobile App"
          </Text>
          <Text className="text-gray-700 text-sm mb-1">
            3. Copy the 6-digit code
          </Text>
          <Text className="text-gray-700 text-sm">
            4. Enter it below
          </Text>
        </View>

        {/* Code Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Connection Code
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="ABC123"
            autoCapitalize="characters"
            maxLength={6}
            className="bg-white border-2 border-gray-300 rounded-lg px-4 py-4 text-2xl text-center font-mono tracking-widest"
          />
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={handleConnect}
          disabled={!code || loading}
          className={`py-4 rounded-lg mb-3 ${
            code && !loading ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <Text className="text-white text-center font-semibold text-base">
            {loading ? 'Connecting...' : 'Connect'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-gray-600 text-center font-medium">
            I'll do this later
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
