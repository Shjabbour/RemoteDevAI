import { View, Text, TouchableOpacity } from 'react-native';
import { Folder, Circle, MessageSquare, Clock } from 'lucide-react-native';
import { Project } from '@types/index';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export default function ProjectCard({ project, onPress }: ProjectCardProps) {
  const statusColor = {
    online: '#10b981',
    offline: '#6b7280',
    busy: '#f59e0b',
  }[project.agentStatus];

  const statusText = {
    online: 'Online',
    offline: 'Offline',
    busy: 'Busy',
  }[project.agentStatus];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-dark-800 rounded-2xl p-4 mb-3 border border-dark-700 active:bg-dark-700"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="bg-primary-600/20 w-12 h-12 rounded-xl items-center justify-center mr-3">
            <Folder size={24} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-lg mb-1" numberOfLines={1}>
              {project.name}
            </Text>
            {project.description && (
              <Text className="text-dark-400 text-sm" numberOfLines={2}>
                {project.description}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-4">
          {/* Agent Status */}
          <View className="flex-row items-center">
            <Circle size={8} color={statusColor} fill={statusColor} />
            <Text className="text-dark-300 text-xs ml-1.5">{statusText}</Text>
          </View>

          {/* Last Activity */}
          {project.lastActivity && (
            <View className="flex-row items-center">
              <Clock size={12} color="#64748b" />
              <Text className="text-dark-400 text-xs ml-1">
                {formatDistanceToNow(new Date(project.lastActivity), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-primary-600/10 px-3 py-1.5 rounded-lg">
          <View className="flex-row items-center">
            <MessageSquare size={14} color="#3b82f6" />
            <Text className="text-primary-500 text-xs font-medium ml-1.5">
              Open Chat
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
