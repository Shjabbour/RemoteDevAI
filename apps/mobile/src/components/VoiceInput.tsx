import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play } from 'lucide-react-native';
import { useVoiceRecording } from '@hooks/useVoiceRecording';
import * as Haptics from 'expo-haptics';

interface VoiceInputProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel?: () => void;
}

export default function VoiceInput({ onRecordingComplete, onCancel }: VoiceInputProps) {
  const {
    isRecording,
    isPaused,
    duration,
    waveformData,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useVoiceRecording();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isRecording) {
      await startRecording();
    } else {
      const recording = await stopRecording();
      if (recording) {
        onRecordingComplete(recording.uri, recording.duration);
      }
    }
  };

  const handlePauseToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  };

  const handleCancel = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelRecording();
    onCancel?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <View className="bg-red-500/10 border border-red-500 rounded-2xl p-4">
        <Text className="text-red-500 text-sm text-center">{error}</Text>
      </View>
    );
  }

  return (
    <View className="bg-dark-800 rounded-2xl p-4">
      {isRecording && (
        <View className="mb-4">
          {/* Duration */}
          <View className="flex-row items-center justify-center mb-3">
            <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            <Text className="text-white text-lg font-semibold">
              {formatDuration(duration)}
            </Text>
          </View>

          {/* Waveform */}
          <View className="flex-row items-center justify-center h-12 space-x-1">
            {waveformData.map((height, index) => (
              <View
                key={index}
                className="bg-primary-500 w-1 rounded-full"
                style={{ height: height * 48 }}
              />
            ))}
          </View>
        </View>
      )}

      <View className="flex-row items-center justify-center space-x-4">
        {isRecording && (
          <>
            {/* Pause/Resume */}
            <TouchableOpacity
              onPress={handlePauseToggle}
              className="bg-dark-700 w-12 h-12 rounded-full items-center justify-center"
            >
              {isPaused ? (
                <Play size={20} color="white" />
              ) : (
                <Pause size={20} color="white" />
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={handleCancel}
              className="bg-red-500/20 w-12 h-12 rounded-full items-center justify-center"
            >
              <Square size={20} color="#ef4444" />
            </TouchableOpacity>
          </>
        )}

        {/* Main Record/Stop Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={handlePress}
            className={`w-16 h-16 rounded-full items-center justify-center ${
              isRecording ? 'bg-red-500' : 'bg-primary-600'
            }`}
          >
            {isRecording ? (
              <Square size={24} color="white" fill="white" />
            ) : (
              <Mic size={24} color="white" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {!isRecording && (
        <Text className="text-dark-400 text-xs text-center mt-3">
          Tap to start recording
        </Text>
      )}
    </View>
  );
}
