import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export default function LoadingSpinner({
  message,
  size = 'large',
}: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center bg-dark-900">
      <ActivityIndicator size={size} color="#3b82f6" />
      {message && (
        <Text className="text-dark-400 text-sm mt-4">{message}</Text>
      )}
    </View>
  );
}
