import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROLES = [
  { value: 'developer', label: 'Developer', icon: '👨‍💻' },
  { value: 'team_lead', label: 'Team Lead', icon: '👔' },
  { value: 'engineering_manager', label: 'Engineering Manager', icon: '👨‍💼' },
  { value: 'other', label: 'Other', icon: '🤝' },
];

export default function Step1() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleContinue = () => {
    if (!name || !role) return;
    // TODO: Call API to save data
    router.push('/onboarding/step-2');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Progress Indicator */}
        <View className="flex-row mb-8">
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              className={`flex-1 h-1 mx-1 rounded ${
                step === 1 ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>

        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Welcome! 👋
        </Text>
        <Text className="text-lg text-gray-600 mb-8">
          Let's set up your profile
        </Text>

        {/* Name Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Your Name *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
          />
        </View>

        {/* Role Selection */}
        <View className="mb-8">
          <Text className="text-sm font-medium text-gray-700 mb-3">
            What's your role? *
          </Text>
          <View className="space-y-3">
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setRole(r.value)}
                className={`p-4 rounded-lg border-2 ${
                  role === r.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">{r.icon}</Text>
                  <Text className="text-base font-medium text-gray-900">
                    {r.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!name || !role}
          className={`py-4 rounded-lg ${
            name && role ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <Text className="text-white text-center font-semibold text-base">
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
