/**
 * WebSocket events and payloads
 */

import {
  Session,
  SessionMessage,
  SessionParticipant,
  SessionStatus
} from './session';
import {
  Recording,
  RecordingStatus
} from './recording';
import {
  AgentStreamEvent,
  AgentStatus,
  AgentType
} from './agent';
import {
  Project,
  ProjectMember
} from './project';

/**
 * Socket event names
 */
export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',

  // Authentication events
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication_error',

  // Session events
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  SESSION_JOINED = 'session_joined',
  SESSION_LEFT = 'session_left',
  SESSION_UPDATED = 'session_updated',
  SESSION_STATUS_CHANGED = 'session_status_changed',
  SESSION_PARTICIPANT_JOINED = 'session_participant_joined',
  SESSION_PARTICIPANT_LEFT = 'session_participant_left',
  SESSION_PARTICIPANT_UPDATED = 'session_participant_updated',

  // Message events
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_UPDATED = 'message_updated',
  MESSAGE_DELETED = 'message_deleted',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',

  // Agent events
  AGENT_EXECUTE = 'agent_execute',
  AGENT_STATUS_CHANGED = 'agent_status_changed',
  AGENT_STREAM = 'agent_stream',
  AGENT_COMPLETED = 'agent_completed',
  AGENT_ERROR = 'agent_error',

  // Recording events
  RECORDING_START = 'recording_start',
  RECORDING_STOP = 'recording_stop',
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped',
  RECORDING_STATUS_CHANGED = 'recording_status_changed',
  RECORDING_PROGRESS = 'recording_progress',

  // Project events
  JOIN_PROJECT = 'join_project',
  LEAVE_PROJECT = 'leave_project',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',
  PROJECT_MEMBER_UPDATED = 'project_member_updated',

  // Collaboration events
  CURSOR_MOVED = 'cursor_moved',
  FILE_OPENED = 'file_opened',
  FILE_CLOSED = 'file_closed',
  FILE_CHANGED = 'file_changed',
  SELECTION_CHANGED = 'selection_changed',

  // Notification events
  NOTIFICATION = 'notification',

  // Presence events
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_ACTIVITY = 'user_activity'
}

/**
 * Socket event payloads
 */

// Authentication
export interface AuthenticatePayload {
  token: string;
}

export interface AuthenticatedPayload {
  userId: string;
  userName: string;
}

export interface AuthenticationErrorPayload {
  error: string;
  message: string;
}

// Session events
export interface JoinSessionPayload {
  sessionId: string;
}

export interface LeaveSessionPayload {
  sessionId: string;
}

export interface SessionJoinedPayload {
  session: Session;
  participant: SessionParticipant;
}

export interface SessionLeftPayload {
  sessionId: string;
  userId: string;
}

export interface SessionUpdatedPayload {
  sessionId: string;
  updates: Partial<Session>;
}

export interface SessionStatusChangedPayload {
  sessionId: string;
  status: SessionStatus;
  previousStatus: SessionStatus;
}

export interface SessionParticipantJoinedPayload {
  sessionId: string;
  participant: SessionParticipant;
}

export interface SessionParticipantLeftPayload {
  sessionId: string;
  userId: string;
}

export interface SessionParticipantUpdatedPayload {
  sessionId: string;
  userId: string;
  updates: Partial<SessionParticipant>;
}

// Message events
export interface MessageSentPayload {
  sessionId: string;
  message: SessionMessage;
}

export interface MessageReceivedPayload {
  sessionId: string;
  message: SessionMessage;
}

export interface MessageUpdatedPayload {
  sessionId: string;
  messageId: string;
  updates: Partial<SessionMessage>;
}

export interface MessageDeletedPayload {
  sessionId: string;
  messageId: string;
}

export interface TypingPayload {
  sessionId: string;
  userId: string;
  userName: string;
}

// Agent events
export interface AgentExecutePayload {
  sessionId: string;
  agentType: AgentType;
  prompt: string;
  requestId: string;
}

export interface AgentStatusChangedPayload {
  sessionId: string;
  agentType: AgentType;
  status: AgentStatus;
  requestId: string;
}

export interface AgentStreamPayload {
  sessionId: string;
  requestId: string;
  event: AgentStreamEvent;
}

export interface AgentCompletedPayload {
  sessionId: string;
  requestId: string;
  agentType: AgentType;
  response: string;
  tokensUsed: number;
  durationMs: number;
}

export interface AgentErrorPayload {
  sessionId: string;
  requestId: string;
  agentType: AgentType;
  error: string;
  message: string;
}

// Recording events
export interface RecordingStartPayload {
  sessionId: string;
  recordingType: string;
  settings: Record<string, any>;
}

export interface RecordingStopPayload {
  recordingId: string;
}

export interface RecordingStartedPayload {
  sessionId: string;
  recording: Recording;
}

export interface RecordingStoppedPayload {
  recordingId: string;
  durationMs: number;
}

export interface RecordingStatusChangedPayload {
  recordingId: string;
  status: RecordingStatus;
  previousStatus: RecordingStatus;
}

export interface RecordingProgressPayload {
  recordingId: string;
  progress: number;
  stage: string;
}

// Project events
export interface JoinProjectPayload {
  projectId: string;
}

export interface LeaveProjectPayload {
  projectId: string;
}

export interface ProjectUpdatedPayload {
  projectId: string;
  updates: Partial<Project>;
}

export interface ProjectMemberAddedPayload {
  projectId: string;
  member: ProjectMember;
}

export interface ProjectMemberRemovedPayload {
  projectId: string;
  userId: string;
}

export interface ProjectMemberUpdatedPayload {
  projectId: string;
  userId: string;
  updates: Partial<ProjectMember>;
}

// Collaboration events
export interface CursorMovedPayload {
  sessionId: string;
  userId: string;
  userName: string;
  file: string;
  line: number;
  column: number;
}

export interface FileOpenedPayload {
  sessionId: string;
  userId: string;
  userName: string;
  file: string;
}

export interface FileClosedPayload {
  sessionId: string;
  userId: string;
  file: string;
}

export interface FileChangedPayload {
  sessionId: string;
  userId: string;
  userName: string;
  file: string;
  changes: {
    range: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    text: string;
  }[];
}

export interface SelectionChangedPayload {
  sessionId: string;
  userId: string;
  userName: string;
  file: string;
  selection: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

// Notification events
export interface NotificationPayload {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId: string;
  timestamp: Date;
  actionUrl?: string;
  actionText?: string;
}

// Presence events
export interface UserOnlinePayload {
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface UserOfflinePayload {
  userId: string;
  timestamp: Date;
}

export interface UserActivityPayload {
  userId: string;
  activity: string;
  timestamp: Date;
}

/**
 * Client to Server events map
 */
export interface ClientToServerEvents {
  [SocketEvents.AUTHENTICATE]: (payload: AuthenticatePayload) => void;
  [SocketEvents.JOIN_SESSION]: (payload: JoinSessionPayload) => void;
  [SocketEvents.LEAVE_SESSION]: (payload: LeaveSessionPayload) => void;
  [SocketEvents.MESSAGE_SENT]: (payload: MessageSentPayload) => void;
  [SocketEvents.MESSAGE_UPDATED]: (payload: MessageUpdatedPayload) => void;
  [SocketEvents.MESSAGE_DELETED]: (payload: MessageDeletedPayload) => void;
  [SocketEvents.TYPING_START]: (payload: TypingPayload) => void;
  [SocketEvents.TYPING_STOP]: (payload: TypingPayload) => void;
  [SocketEvents.AGENT_EXECUTE]: (payload: AgentExecutePayload) => void;
  [SocketEvents.RECORDING_START]: (payload: RecordingStartPayload) => void;
  [SocketEvents.RECORDING_STOP]: (payload: RecordingStopPayload) => void;
  [SocketEvents.JOIN_PROJECT]: (payload: JoinProjectPayload) => void;
  [SocketEvents.LEAVE_PROJECT]: (payload: LeaveProjectPayload) => void;
  [SocketEvents.CURSOR_MOVED]: (payload: CursorMovedPayload) => void;
  [SocketEvents.FILE_OPENED]: (payload: FileOpenedPayload) => void;
  [SocketEvents.FILE_CLOSED]: (payload: FileClosedPayload) => void;
  [SocketEvents.FILE_CHANGED]: (payload: FileChangedPayload) => void;
  [SocketEvents.SELECTION_CHANGED]: (payload: SelectionChangedPayload) => void;
}

/**
 * Server to Client events map
 */
export interface ServerToClientEvents {
  [SocketEvents.AUTHENTICATED]: (payload: AuthenticatedPayload) => void;
  [SocketEvents.AUTHENTICATION_ERROR]: (payload: AuthenticationErrorPayload) => void;
  [SocketEvents.SESSION_JOINED]: (payload: SessionJoinedPayload) => void;
  [SocketEvents.SESSION_LEFT]: (payload: SessionLeftPayload) => void;
  [SocketEvents.SESSION_UPDATED]: (payload: SessionUpdatedPayload) => void;
  [SocketEvents.SESSION_STATUS_CHANGED]: (payload: SessionStatusChangedPayload) => void;
  [SocketEvents.SESSION_PARTICIPANT_JOINED]: (payload: SessionParticipantJoinedPayload) => void;
  [SocketEvents.SESSION_PARTICIPANT_LEFT]: (payload: SessionParticipantLeftPayload) => void;
  [SocketEvents.SESSION_PARTICIPANT_UPDATED]: (payload: SessionParticipantUpdatedPayload) => void;
  [SocketEvents.MESSAGE_RECEIVED]: (payload: MessageReceivedPayload) => void;
  [SocketEvents.MESSAGE_UPDATED]: (payload: MessageUpdatedPayload) => void;
  [SocketEvents.MESSAGE_DELETED]: (payload: MessageDeletedPayload) => void;
  [SocketEvents.TYPING_START]: (payload: TypingPayload) => void;
  [SocketEvents.TYPING_STOP]: (payload: TypingPayload) => void;
  [SocketEvents.AGENT_STATUS_CHANGED]: (payload: AgentStatusChangedPayload) => void;
  [SocketEvents.AGENT_STREAM]: (payload: AgentStreamPayload) => void;
  [SocketEvents.AGENT_COMPLETED]: (payload: AgentCompletedPayload) => void;
  [SocketEvents.AGENT_ERROR]: (payload: AgentErrorPayload) => void;
  [SocketEvents.RECORDING_STARTED]: (payload: RecordingStartedPayload) => void;
  [SocketEvents.RECORDING_STOPPED]: (payload: RecordingStoppedPayload) => void;
  [SocketEvents.RECORDING_STATUS_CHANGED]: (payload: RecordingStatusChangedPayload) => void;
  [SocketEvents.RECORDING_PROGRESS]: (payload: RecordingProgressPayload) => void;
  [SocketEvents.PROJECT_UPDATED]: (payload: ProjectUpdatedPayload) => void;
  [SocketEvents.PROJECT_MEMBER_ADDED]: (payload: ProjectMemberAddedPayload) => void;
  [SocketEvents.PROJECT_MEMBER_REMOVED]: (payload: ProjectMemberRemovedPayload) => void;
  [SocketEvents.PROJECT_MEMBER_UPDATED]: (payload: ProjectMemberUpdatedPayload) => void;
  [SocketEvents.CURSOR_MOVED]: (payload: CursorMovedPayload) => void;
  [SocketEvents.FILE_OPENED]: (payload: FileOpenedPayload) => void;
  [SocketEvents.FILE_CLOSED]: (payload: FileClosedPayload) => void;
  [SocketEvents.FILE_CHANGED]: (payload: FileChangedPayload) => void;
  [SocketEvents.SELECTION_CHANGED]: (payload: SelectionChangedPayload) => void;
  [SocketEvents.NOTIFICATION]: (payload: NotificationPayload) => void;
  [SocketEvents.USER_ONLINE]: (payload: UserOnlinePayload) => void;
  [SocketEvents.USER_OFFLINE]: (payload: UserOfflinePayload) => void;
  [SocketEvents.USER_ACTIVITY]: (payload: UserActivityPayload) => void;
  [SocketEvents.ERROR]: (payload: { error: string; message: string }) => void;
}
