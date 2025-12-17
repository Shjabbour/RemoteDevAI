import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreVertical } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useProject } from '@hooks/useProject';
import { useSocket } from '@hooks/useSocket';
import { useChatStore } from '@stores/chatStore';
import { api } from '@services/api';
import ChatBubble from '@components/ChatBubble';
import ChatInput from '@components/ChatInput';
import LoadingSpinner from '@components/LoadingSpinner';
import StatusIndicator from '@components/StatusIndicator';
import { Message } from '@types/index';

export default function ChatScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const { currentProject, selectProject } = useProject(projectId);
  const { isConnected, on, off, joinProject, leaveProject } = useSocket();
  const {
    getProjectMessages,
    addMessage,
    updateMessage,
    setMessages,
    isTyping,
    setIsTyping,
  } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messages = getProjectMessages(projectId || '');

  // Load messages on mount
  useEffect(() => {
    if (!projectId) return;

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const response = await api.getMessages(projectId);
        if (response.success && response.data) {
          setMessages(projectId, response.data);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
    selectProject(projectId);
  }, [projectId]);

  // Join project room and listen for messages
  useEffect(() => {
    if (!isConnected || !projectId) return;

    joinProject(projectId);

    const handleMessage = (data: Message) => {
      if (data.projectId === projectId) {
        addMessage(projectId, data);
        scrollToBottom();
      }
    };

    const handleTyping = (data: { projectId: string; isTyping: boolean }) => {
      if (data.projectId === projectId) {
        setIsTyping(data.isTyping);
      }
    };

    const handleMessageUpdate = (data: {
      projectId: string;
      messageId: string;
      updates: Partial<Message>;
    }) => {
      if (data.projectId === projectId) {
        updateMessage(projectId, data.messageId, data.updates);
      }
    };

    on('message', handleMessage);
    on('typing', handleTyping);
    on('message_update', handleMessageUpdate);

    return () => {
      off('message', handleMessage);
      off('typing', handleTyping);
      off('message_update', handleMessageUpdate);
      leaveProject(projectId);
    };
  }, [isConnected, projectId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendText = async (text: string) => {
    if (!projectId || isSending) return;

    try {
      setIsSending(true);
      const response = await api.sendMessage(projectId, text, 'text');

      if (response.success && response.data) {
        addMessage(projectId, response.data);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoice = async (uri: string, duration: number) => {
    if (!projectId || isSending) return;

    try {
      setIsSending(true);
      const response = await api.uploadVoiceMessage(projectId, uri, duration);

      if (response.success && response.data) {
        addMessage(projectId, response.data);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading chat..." />;
  }

  if (!currentProject) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center">
        <Text className="text-white text-lg">Project not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800 px-4 py-3 border-b border-dark-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={handleBack} className="mr-3">
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {currentProject.name}
              </Text>
              <StatusIndicator
                status={currentProject.agentStatus}
                size="sm"
              />
            </View>
          </View>
          <TouchableOpacity className="p-2">
            <MoreVertical size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-dark-400 text-base text-center">
              No messages yet. Start a conversation!
            </Text>
          </View>
        }
        ListFooterComponent={
          isTyping ? (
            <View className="flex-row items-center mb-4">
              <View className="bg-dark-800 rounded-2xl px-4 py-3">
                <View className="flex-row space-x-1">
                  <View className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  <View
                    className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <View
                    className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <ChatInput
        onSendText={handleSendText}
        onSendVoice={handleSendVoice}
        disabled={isSending || !isConnected}
      />
    </SafeAreaView>
  );
}
