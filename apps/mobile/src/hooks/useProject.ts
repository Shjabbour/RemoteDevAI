import { useEffect, useState, useCallback } from 'react';
import { api } from '@services/api';
import { useProjectStore } from '@stores/projectStore';
import { Project, CreateProjectInput } from '@types/index';
import { useSocket } from './useSocket';

export const useProject = (projectId?: string) => {
  const {
    projects,
    currentProject,
    isLoading,
    error,
    setProjects,
    addProject,
    updateProject,
    deleteProject: deleteProjectFromStore,
    setCurrentProject,
    setLoading,
    setError,
    getProjectById,
  } = useProjectStore();

  const { on, off, isConnected } = useSocket();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getProjects();
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [setProjects, setLoading, setError]);

  // Fetch single project
  const fetchProject = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getProject(id);
        if (response.success && response.data) {
          updateProject(id, response.data);
          if (projectId === id) {
            setCurrentProject(response.data);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch project');
      } finally {
        setLoading(false);
      }
    },
    [projectId, updateProject, setCurrentProject, setLoading, setError]
  );

  // Create project
  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<Project | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.createProject(input);
        if (response.success && response.data) {
          addProject(response.data);
          return response.data;
        }
        return null;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to create project');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [addProject, setLoading, setError]
  );

  // Update project
  const updateProjectData = useCallback(
    async (id: string, updates: Partial<Project>): Promise<boolean> => {
      try {
        setError(null);
        const response = await api.updateProject(id, updates);
        if (response.success && response.data) {
          updateProject(id, response.data);
          return true;
        }
        return false;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update project');
        return false;
      }
    },
    [updateProject, setError]
  );

  // Delete project
  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);
        const response = await api.deleteProject(id);
        if (response.success) {
          deleteProjectFromStore(id);
          return true;
        }
        return false;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete project');
        return false;
      }
    },
    [deleteProjectFromStore, setError]
  );

  // Refresh with pull-to-refresh
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  // Set current project by ID
  const selectProject = useCallback(
    (id: string) => {
      const project = getProjectById(id);
      if (project) {
        setCurrentProject(project);
      } else {
        fetchProject(id);
      }
    },
    [getProjectById, setCurrentProject, fetchProject]
  );

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const handleAgentStatus = (data: any) => {
      if (data.projectId) {
        updateProject(data.projectId, {
          agentStatus: data.status,
          desktopAgentConnected: data.status === 'online',
          lastActivity: new Date().toISOString(),
        });
      }
    };

    const handleProjectUpdate = (data: any) => {
      if (data.projectId) {
        updateProject(data.projectId, data.updates);
      }
    };

    on('agent_status', handleAgentStatus);
    on('project_update', handleProjectUpdate);

    return () => {
      off('agent_status', handleAgentStatus);
      off('project_update', handleProjectUpdate);
    };
  }, [isConnected, on, off, updateProject]);

  // Fetch project on mount if projectId provided
  useEffect(() => {
    if (projectId) {
      selectProject(projectId);
    }
  }, [projectId]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    currentProject,
    isLoading,
    error,
    refreshing,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject: updateProjectData,
    deleteProject,
    selectProject,
    refresh,
  };
};
