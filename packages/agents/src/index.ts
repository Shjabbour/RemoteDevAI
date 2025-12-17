/**
 * RemoteDevAI Agents Package
 *
 * This package contains 10 specialized AI agents that power the RemoteDevAI system:
 *
 * 1. VoiceTranscriptionAgent - Converts voice audio to text
 * 2. IntentParserAgent - Parses user intent from text
 * 3. CodeOrchestratorAgent - Manages Claude Code CLI interactions
 * 4. FileSystemAgent - Handles file and git operations
 * 5. ScreenRecorderAgent - Records screen/browser/terminal
 * 6. VideoProcessingAgent - Processes and compresses videos
 * 7. NotificationAgent - Sends notifications via multiple channels
 * 8. SecurityAgent - Validates security and manages permissions
 * 9. SessionManagerAgent - Manages user sessions
 * 10. FeedbackLoopAgent - Processes feedback and learns preferences
 *
 * Plus the AgentOrchestrator that coordinates all agents.
 */

// Export types
export * from './types';

// Export base agent
export { BaseAgent } from './base/BaseAgent';

// Export all agents
export { VoiceTranscriptionAgent } from './agents/VoiceTranscriptionAgent';
export { IntentParserAgent } from './agents/IntentParserAgent';
export { CodeOrchestratorAgent } from './agents/CodeOrchestratorAgent';
export { FileSystemAgent } from './agents/FileSystemAgent';
export { ScreenRecorderAgent } from './agents/ScreenRecorderAgent';
export { VideoProcessingAgent } from './agents/VideoProcessingAgent';
export { NotificationAgent } from './agents/NotificationAgent';
export { SecurityAgent } from './agents/SecurityAgent';
export { SessionManagerAgent } from './agents/SessionManagerAgent';
export { FeedbackLoopAgent } from './agents/FeedbackLoopAgent';

// Export orchestrator
export { AgentOrchestrator } from './orchestrator/AgentOrchestrator';

// Re-export commonly used types for convenience
export type {
  AgentMessage,
  AgentContext,
  AgentResponse,
  AgentConfig,
  SessionState,
  UserPreferences,
  ParsedIntent,
  FileOperation,
  GitOperation,
  NotificationPayload,
  FeedbackData,
} from './types';
