import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Volume2, Copy, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Message } from '@types/index';
import { voiceService } from '@services/voice';
import CodeBlock from './CodeBlock';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handlePlayVoice = async () => {
    if (!message.voiceUrl) return;

    try {
      setIsPlaying(true);
      await voiceService.playAudio(message.voiceUrl);
    } catch (error) {
      console.error('Error playing voice:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleCopy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (message.type === 'code' && message.metadata?.codeLanguage) {
      return (
        <CodeBlock
          code={message.content}
          language={message.metadata.codeLanguage}
        />
      );
    }

    return (
      <Text className={`text-base ${isUser ? 'text-white' : 'text-dark-100'}`}>
        {message.content}
      </Text>
    );
  };

  return (
    <View
      className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <View className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <View
          className={`rounded-2xl p-4 ${
            isUser ? 'bg-primary-600' : 'bg-dark-800'
          }`}
        >
          {renderContent()}

          {message.type === 'voice' && message.voiceDuration && (
            <View className="flex-row items-center mt-2 space-x-2">
              <TouchableOpacity
                onPress={handlePlayVoice}
                disabled={isPlaying}
                className="bg-dark-700/50 px-3 py-2 rounded-lg flex-row items-center"
              >
                {isPlaying ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Volume2 size={16} color="white" />
                )}
                <Text className="text-white text-xs ml-2">
                  {Math.floor(message.voiceDuration)}s
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {message.metadata?.executionResult && (
            <View className="mt-3 bg-dark-900/50 rounded-lg p-3">
              <Text className="text-dark-400 text-xs mb-1">Output:</Text>
              <Text className="text-dark-200 text-sm font-mono">
                {message.metadata.executionResult}
              </Text>
            </View>
          )}
        </View>

        {/* Actions & Timestamp */}
        <View className="flex-row items-center mt-1 px-1 space-x-2">
          <Text className="text-dark-500 text-xs">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </Text>

          {!isUser && (
            <TouchableOpacity onPress={handleCopy} className="ml-2">
              {copied ? (
                <Check size={14} color="#10b981" />
              ) : (
                <Copy size={14} color="#64748b" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {message.isStreaming && (
          <View className="flex-row items-center mt-2">
            <View className="w-2 h-2 bg-primary-500 rounded-full animate-pulse mr-1" />
            <View
              className="w-2 h-2 bg-primary-500 rounded-full animate-pulse mr-1"
              style={{ animationDelay: '0.2s' }}
            />
            <View
              className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"
              style={{ animationDelay: '0.4s' }}
            />
          </View>
        )}
      </View>
    </View>
  );
}
