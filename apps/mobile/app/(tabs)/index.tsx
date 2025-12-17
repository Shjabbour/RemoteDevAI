import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { useProject } from '@hooks/useProject';
import ProjectCard from '@components/ProjectCard';
import LoadingSpinner from '@components/LoadingSpinner';
import StatusIndicator from '@components/StatusIndicator';
import { useSocket } from '@hooks/useSocket';

export default function ProjectsScreen() {
  const router = useRouter();
  const { projects, isLoading, refreshing, refresh, createProject } = useProject();
  const { isConnected } = useSocket();
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = () => {
    Alert.prompt(
      'New Project',
      'Enter a name for your project',
      async (name) => {
        if (!name?.trim()) return;

        setCreatingProject(true);
        const project = await createProject({ name: name.trim() });
        setCreatingProject(false);

        if (project) {
          router.push(`/(tabs)/chat/${project.id}`);
        } else {
          Alert.alert('Error', 'Failed to create project');
        }
      },
      'plain-text'
    );
  };

  const handleProjectPress = (projectId: string) => {
    router.push(`/(tabs)/chat/${projectId}`);
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading projects..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      {/* Header */}
      <View className="px-4 py-4 border-b border-dark-800">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white text-2xl font-bold mb-1">Projects</Text>
            <StatusIndicator status={isConnected ? 'online' : 'offline'} size="sm" />
          </View>
          <View className="flex-row space-x-2">
            <TouchableOpacity className="bg-dark-800 w-10 h-10 rounded-xl items-center justify-center">
              <Search size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateProject}
              disabled={creatingProject}
              className={`bg-primary-600 w-10 h-10 rounded-xl items-center justify-center ${
                creatingProject ? 'opacity-50' : ''
              }`}
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Projects List */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => handleProjectPress(item.id)} />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="bg-dark-800 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Plus size={32} color="#64748b" />
            </View>
            <Text className="text-white text-lg font-semibold mb-2">
              No Projects Yet
            </Text>
            <Text className="text-dark-400 text-sm text-center mb-6">
              Create your first project to get started
            </Text>
            <TouchableOpacity
              onPress={handleCreateProject}
              disabled={creatingProject}
              className="bg-primary-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create Project</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
