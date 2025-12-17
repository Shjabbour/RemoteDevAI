import axios, { AxiosInstance, AxiosError } from 'axios';
import { configManager } from './config.js';
import { logger } from './logger.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = configManager.getDefaultApiUrl();
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include API key
    this.client.interceptors.request.use(async (config) => {
      const apiKey = await configManager.get('apiKey');
      if (apiKey) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Authentication failed. Please login again.');
        } else if (error.response?.status === 403) {
          logger.error('Access forbidden. Check your permissions.');
        } else if (error.response?.status >= 500) {
          logger.error('Server error. Please try again later.');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set base URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<ApiResponse<{ apiKey: string; userId: string }>> {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify API key
   */
  async verifyApiKey(apiKey: string): Promise<ApiResponse<{ valid: boolean; user: any }>> {
    try {
      const response = await this.client.get('/auth/verify', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/users/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get project details
   */
  async getProject(projectId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List user's projects
   */
  async listProjects(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/projects');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new project
   */
  async createProject(data: { name: string; description?: string }): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/projects', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Register desktop agent
   */
  async registerAgent(data: {
    projectId: string;
    hostname: string;
    platform: string;
    version: string;
  }): Promise<ApiResponse<{ agentId: string; token: string }>> {
    try {
      const response = await this.client.post('/agents/register', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/agents/${agentId}/status`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update agent heartbeat
   */
  async updateAgentHeartbeat(agentId: string, data: any): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/agents/${agentId}/heartbeat`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check for agent updates
   */
  async checkAgentUpdate(currentVersion: string): Promise<ApiResponse<{
    updateAvailable: boolean;
    latestVersion: string;
    downloadUrl: string;
    releaseNotes: string;
  }>> {
    try {
      const response = await this.client.get('/agents/updates', {
        params: { currentVersion },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Download file with progress
   */
  async downloadFile(url: string, onProgress?: (progress: number) => void): Promise<Buffer> {
    try {
      const response = await this.client.get(url, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}

export const apiClient = new ApiClient();
