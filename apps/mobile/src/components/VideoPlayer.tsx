import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useState, useRef } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

export default function VideoPlayer({ videoUrl, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = async () => {
    if (!videoRef.current) return;

    await videoRef.current.setIsMutedAsync(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleFullscreen = async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
  };

  const handlePlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    if (playbackStatus.isLoaded) {
      setIsLoading(false);
      setIsPlaying(playbackStatus.isPlaying);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-black">
      {/* Video */}
      <View className="flex-1 items-center justify-center">
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View className="absolute inset-0 items-center justify-center bg-black/50">
            <ActivityIndicator size="large" color="white" />
          </View>
        )}

        {/* Controls Overlay */}
        <View className="absolute inset-0">
          {/* Top Bar */}
          {title && (
            <View className="bg-black/60 px-4 py-3">
              <Text className="text-white font-semibold text-lg">{title}</Text>
            </View>
          )}

          {/* Center Play Button */}
          {!isPlaying && !isLoading && (
            <View className="flex-1 items-center justify-center">
              <TouchableOpacity
                onPress={handlePlayPause}
                className="bg-black/60 w-20 h-20 rounded-full items-center justify-center"
              >
                <Play size={40} color="white" fill="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Controls */}
          <View className="bg-black/60 px-4 py-3">
            {/* Progress Bar */}
            {status?.isLoaded && (
              <View className="mb-3">
                <View className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary-500 rounded-full"
                    style={{
                      width: `${
                        (status.positionMillis / status.durationMillis) * 100
                      }%`,
                    }}
                  />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-white text-xs">
                    {formatTime(status.positionMillis)}
                  </Text>
                  <Text className="text-white text-xs">
                    {formatTime(status.durationMillis)}
                  </Text>
                </View>
              </View>
            )}

            {/* Control Buttons */}
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handlePlayPause}
                className="w-12 h-12 items-center justify-center"
              >
                {isPlaying ? (
                  <Pause size={24} color="white" />
                ) : (
                  <Play size={24} color="white" />
                )}
              </TouchableOpacity>

              <View className="flex-row space-x-4">
                <TouchableOpacity
                  onPress={handleMuteToggle}
                  className="w-12 h-12 items-center justify-center"
                >
                  {isMuted ? (
                    <VolumeX size={24} color="white" />
                  ) : (
                    <Volume2 size={24} color="white" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleFullscreen}
                  className="w-12 h-12 items-center justify-center"
                >
                  <Maximize size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
