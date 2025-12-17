import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Circle } from 'lucide-react-native';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusIndicator({
  status,
  showLabel = true,
  size = 'md',
}: StatusIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const config = {
    online: {
      color: '#10b981',
      label: 'Online',
    },
    offline: {
      color: '#6b7280',
      label: 'Offline',
    },
    busy: {
      color: '#f59e0b',
      label: 'Busy',
    },
  };

  const sizeConfig = {
    sm: { dot: 6, text: 'text-xs' },
    md: { dot: 8, text: 'text-sm' },
    lg: { dot: 10, text: 'text-base' },
  };

  useEffect(() => {
    if (status === 'online' || status === 'busy') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  return (
    <View className="flex-row items-center">
      <View className="relative">
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
            opacity: 0.3,
          }}
        >
          <Circle
            size={sizeConfig[size].dot * 2}
            color={config[status].color}
            fill={config[status].color}
          />
        </Animated.View>
        <View className="absolute inset-0 items-center justify-center">
          <Circle
            size={sizeConfig[size].dot}
            color={config[status].color}
            fill={config[status].color}
          />
        </View>
      </View>
      {showLabel && (
        <Text className={`text-dark-300 ${sizeConfig[size].text} ml-2`}>
          {config[status].label}
        </Text>
      )}
    </View>
  );
}
