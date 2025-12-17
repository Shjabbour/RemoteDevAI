// User & Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

// Projects
export interface Project {
  id: string;
  name: string;
  description?: string;
  agentStatus: 'online' | 'offline' | 'busy';
  lastActivity?: string;
  desktopAgentConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

// Chat & Messages
export interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: 'text' | 'voice' | 'code' | 'file';
  voiceUrl?: string;
  voiceDuration?: number;
  metadata?: {
    codeLanguage?: string;
    fileName?: string;
    fileSize?: number;
    executionResult?: string;
  };
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatState {
  messages: Record<string, Message[]>; // projectId -> messages
  isTyping: boolean;
  currentProjectId: string | null;
}

// Voice Recording
export interface VoiceRecording {
  uri: string;
  duration: number;
  size: number;
}

export interface VoiceInputState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  waveformData: number[];
}

// Video Recordings
export interface VideoRecording {
  id: string;
  projectId: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl: string;
  size: number;
  createdAt: string;
}

// Desktop Agent Status
export interface AgentStatus {
  status: 'online' | 'offline' | 'busy';
  currentTask?: string;
  systemInfo?: {
    platform: string;
    memory: number;
    cpu: number;
  };
  lastSeen: string;
}

// Notifications
export interface Notification {
  id: string;
  type: 'message' | 'agent_status' | 'recording_ready' | 'error';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

// Settings
export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  autoPlayVoice: boolean;
  recordingQuality: 'low' | 'medium' | 'high';
  language: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// WebSocket Events
export type SocketEvent =
  | 'message'
  | 'agent_status'
  | 'recording_ready'
  | 'task_update'
  | 'error';

export interface SocketMessage {
  event: SocketEvent;
  data: any;
  timestamp: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Navigation Types
export type RootStackParamList = {
  index: undefined;
  '(auth)/login': undefined;
  '(auth)/register': undefined;
  '(tabs)': undefined;
};

export type TabsParamList = {
  index: undefined;
  'chat/[projectId]': { projectId: string };
  recordings: undefined;
  settings: undefined;
};
