import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { api } from '@services/api';
import RecordingCard from '@components/RecordingCard';
import LoadingSpinner from '@components/LoadingSpinner';
import { VideoRecording } from '@types/index';

export default function RecordingsScreen() {
  const [recordings, setRecordings] = useState<VideoRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      const response = await api.getRecordings();
      if (response.success && response.data) {
        setRecordings(response.data);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      Alert.alert('Error', 'Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  };

  const handlePlay = (recording: VideoRecording) => {
    // In a real app, you'd navigate to a video player screen
    Alert.alert('Play Recording', `Would play: ${recording.title}`);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteRecording(id);
              if (response.success) {
                setRecordings((prev) => prev.filter((r) => r.id !== id));
                Alert.alert('Success', 'Recording deleted');
              }
            } catch (error) {
              console.error('Error deleting recording:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading recordings..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      {/* Header */}
      <View className="px-4 py-4 border-b border-dark-800">
        <Text className="text-white text-2xl font-bold">Recordings</Text>
        <Text className="text-dark-400 text-sm mt-1">
          {recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'}
        </Text>
      </View>

      {/* Recordings List */}
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordingCard
            recording={item}
            onPlay={() => handlePlay(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="bg-dark-800 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Video size={32} color="#64748b" />
            </View>
            <Text className="text-white text-lg font-semibold mb-2">
              No Recordings Yet
            </Text>
            <Text className="text-dark-400 text-sm text-center">
              Your desktop agent recordings will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
