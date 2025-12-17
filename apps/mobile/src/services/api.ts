import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import { ApiResponse, Project, Message, VideoRecording, CreateProjectInput } from '@types/index';
import { useAuthStore } from '@stores/authStore';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  }

  async register(name: string, email: string, password: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return data;
  }

  async logout() {
    const { data } = await this.client.post<ApiResponse>('/auth/logout');
    return data;
  }

  // Projects
  async getProjects() {
    const { data } = await this.client.get<ApiResponse<Project[]>>('/projects');
    return data;
  }

  async getProject(id: string) {
    const { data } = await this.client.get<ApiResponse<Project>>(`/projects/${id}`);
    return data;
  }

  async createProject(input: CreateProjectInput) {
    const { data } = await this.client.post<ApiResponse<Project>>('/projects', input);
    return data;
  }

  async updateProject(id: string, updates: Partial<Project>) {
    const { data } = await this.client.patch<ApiResponse<Project>>(`/projects/${id}`, updates);
    return data;
  }

  async deleteProject(id: string) {
    const { data } = await this.client.delete<ApiResponse>(`/projects/${id}`);
    return data;
  }

  // Messages
  async getMessages(projectId: string, limit = 50, offset = 0) {
    const { data } = await this.client.get<ApiResponse<Message[]>>(
      `/projects/${projectId}/messages`,
      {
        params: { limit, offset },
      }
    );
    return data;
  }

  async sendMessage(projectId: string, content: string, type: 'text' | 'voice' = 'text') {
    const { data } = await this.client.post<ApiResponse<Message>>(
      `/projects/${projectId}/messages`,
      {
        content,
        type,
      }
    );
    return data;
  }

  async uploadVoiceMessage(projectId: string, audioUri: string, duration: number) {
    const formData = new FormData();

    // @ts-ignore - React Native FormData handles files differently
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'voice-message.m4a',
    });
    formData.append('duration', duration.toString());

    const { data } = await this.client.post<ApiResponse<Message>>(
      `/projects/${projectId}/messages/voice`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  // Recordings
  async getRecordings(projectId?: string) {
    const { data } = await this.client.get<ApiResponse<VideoRecording[]>>('/recordings', {
      params: { projectId },
    });
    return data;
  }

  async getRecording(id: string) {
    const { data } = await this.client.get<ApiResponse<VideoRecording>>(`/recordings/${id}`);
    return data;
  }

  async deleteRecording(id: string) {
    const { data } = await this.client.delete<ApiResponse>(`/recordings/${id}`);
    return data;
  }

  // Agent Status
  async getAgentStatus(projectId: string) {
    const { data } = await this.client.get<ApiResponse>(`/projects/${projectId}/agent/status`);
    return data;
  }

  // Notifications
  async registerPushToken(token: string, deviceId: string) {
    const { data } = await this.client.post<ApiResponse>('/notifications/register', {
      token,
      deviceId,
    });
    return data;
  }

  async unregisterPushToken(deviceId: string) {
    const { data } = await this.client.delete<ApiResponse>(`/notifications/register/${deviceId}`);
    return data;
  }
}

export const api = new ApiService();
