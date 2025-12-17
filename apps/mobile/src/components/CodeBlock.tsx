import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View className="bg-dark-900 rounded-lg overflow-hidden my-2">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-dark-800 px-3 py-2 border-b border-dark-700">
        <Text className="text-dark-400 text-xs font-mono">{language}</Text>
        <TouchableOpacity onPress={handleCopy} className="p-1">
          {copied ? (
            <View className="flex-row items-center">
              <Check size={14} color="#10b981" />
              <Text className="text-green-500 text-xs ml-1">Copied!</Text>
            </View>
          ) : (
            <Copy size={14} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Code */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="p-3"
      >
        <Text className="text-dark-100 text-sm font-mono leading-6">{code}</Text>
      </ScrollView>
    </View>
  );
}
