import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Send, Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import VoiceInput from './VoiceInput';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendVoice: (uri: string, duration: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendText,
  onSendVoice,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSendText(text.trim());
    setText('');
  };

  const handleVoiceToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowVoiceInput(!showVoiceInput);
  };

  const handleRecordingComplete = async (uri: string, duration: number) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSendVoice(uri, duration);
    setShowVoiceInput(false);
  };

  const handleRecordingCancel = () => {
    setShowVoiceInput(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View className="bg-dark-900 border-t border-dark-800 px-4 py-3">
        {showVoiceInput ? (
          <VoiceInput
            onRecordingComplete={handleRecordingComplete}
            onCancel={handleRecordingCancel}
          />
        ) : (
          <View className="flex-row items-center space-x-2">
            <View className="flex-1 bg-dark-800 rounded-full flex-row items-center px-4 py-2">
              <TextInput
                className="flex-1 text-white text-base"
                placeholder={placeholder}
                placeholderTextColor="#64748b"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
                editable={!disabled}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
            </View>

            {text.trim() ? (
              <TouchableOpacity
                onPress={handleSend}
                disabled={disabled}
                className={`bg-primary-600 w-10 h-10 rounded-full items-center justify-center ${
                  disabled ? 'opacity-50' : ''
                }`}
              >
                <Send size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleVoiceToggle}
                disabled={disabled}
                className={`bg-primary-600 w-10 h-10 rounded-full items-center justify-center ${
                  disabled ? 'opacity-50' : ''
                }`}
              >
                <Mic size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
