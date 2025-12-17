import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Play, Trash2, Download, Clock } from 'lucide-react-native';
import { VideoRecording } from '@types/index';
import { formatDistanceToNow } from 'date-fns';

interface RecordingCardProps {
  recording: VideoRecording;
  onPlay: () => void;
  onDelete?: () => void;
}

export default function RecordingCard({
  recording,
  onPlay,
  onDelete,
}: RecordingCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <TouchableOpacity
      onPress={onPlay}
      className="bg-dark-800 rounded-2xl overflow-hidden mb-3 border border-dark-700 active:bg-dark-700"
    >
      {/* Thumbnail */}
      <View className="relative">
        {recording.thumbnailUrl ? (
          <Image
            source={{ uri: recording.thumbnailUrl }}
            className="w-full h-48"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-48 bg-dark-700 items-center justify-center">
            <Play size={48} color="#64748b" />
          </View>
        )}

        {/* Duration Badge */}
        <View className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded">
          <Text className="text-white text-xs font-mono">
            {formatDuration(recording.duration)}
          </Text>
        </View>

        {/* Play Overlay */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="bg-black/40 w-16 h-16 rounded-full items-center justify-center">
            <Play size={28} color="white" fill="white" />
          </View>
        </View>
      </View>

      {/* Info */}
      <View className="p-4">
        <Text className="text-white font-semibold text-base mb-2" numberOfLines={1}>
          {recording.title}
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-4">
            <View className="flex-row items-center">
              <Clock size={14} color="#64748b" />
              <Text className="text-dark-400 text-xs ml-1">
                {formatDistanceToNow(new Date(recording.createdAt), {
                  addSuffix: true,
                })}
              </Text>
            </View>

            <Text className="text-dark-400 text-xs">
              {formatFileSize(recording.size)}
            </Text>
          </View>

          {onDelete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-red-500/10 p-2 rounded-lg"
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
