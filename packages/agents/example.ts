/**
 * Example usage of RemoteDevAI Agents
 *
 * This file demonstrates how to use the agent system
 */

import {
  AgentOrchestrator,
  MessageType,
  AgentType,
  IntentCategory,
  NotificationPriority,
} from './src/index';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Initializing RemoteDevAI Agents...\n');

  // Create orchestrator
  const orchestrator = new AgentOrchestrator({
    environment: {
      nodeEnv: 'development',
      workspaceRoot: process.cwd(),
      tempDir: '/tmp',
      storageProvider: 'local',
      apiKeys: {
        anthropic: process.env.ANTHROPIC_API_KEY,
        googleCloud: process.env.GOOGLE_CLOUD_API_KEY,
      },
    },
    defaultPreferences: {
      voiceSettings: {
        language: 'en-US',
        speakingRate: 1.0,
        pitch: 0.0,
      },
      codeStyle: {
        indentSize: 2,
        useTabs: false,
        lineWidth: 80,
        semicolons: true,
      },
      notifications: {
        email: false,
        push: true,
        inApp: true,
      },
      recording: {
        autoRecord: false,
        quality: 'medium',
        fps: 30,
      },
      aiModel: {
        provider: 'anthropic',
        model: 'claude-opus-4-5-20251101',
        temperature: 0.7,
        maxTokens: 4000,
      },
    },
  });

  // Initialize all agents
  await orchestrator.initialize();
  console.log('✅ Agents initialized\n');

  // Check health
  const health = await orchestrator.healthCheck();
  console.log('🏥 Health Check:', health.healthy ? 'PASSED' : 'FAILED');
  console.log('   Agents:', Object.entries(health.agents).map(([k, v]) => `${k}: ${v ? '✓' : '✗'}`).join(', '));
  console.log();

  // Example 1: Text-based intent parsing
  console.log('📝 Example 1: Parsing intent from text...');
  const textMessage = {
    id: uuidv4(),
    type: MessageType.TEXT_INPUT,
    source: AgentType.INTENT_PARSER,
    timestamp: new Date().toISOString(),
    payload: {
      text: 'Add a login feature to the application with email and password authentication',
      source: 'text',
    },
    metadata: {
      sessionId: 'demo-session-1',
      userId: 'demo-user',
      projectId: 'demo-project',
    },
  };

  // Listen for events
  orchestrator.on('agent-event', (event) => {
    console.log(`   [Event] ${event.agentType}: ${event.event}`);
  });

  await orchestrator.sendMessage(textMessage);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
  console.log();

  // Example 2: Create a session
  console.log('📋 Example 2: Creating a session...');
  const sessionAgent = orchestrator.getAgent(AgentType.SESSION_MANAGER);
  if (sessionAgent) {
    const session = await (sessionAgent as any).createSession({
      userId: 'demo-user',
      projectId: 'demo-project',
      metadata: { source: 'example' },
    });
    console.log(`   Session created: ${session.id}`);
    console.log(`   Status: ${session.status}`);

    // Add a message
    await (sessionAgent as any).addMessage(
      session.id,
      'user',
      'Add login feature'
    );
    console.log('   Message added to conversation');
  }
  console.log();

  // Example 3: Send a notification
  console.log('🔔 Example 3: Sending notification...');
  const notificationMessage = {
    id: uuidv4(),
    type: MessageType.NOTIFICATION,
    source: AgentType.NOTIFICATION,
    timestamp: new Date().toISOString(),
    payload: {
      title: 'Agent System Ready',
      message: 'RemoteDevAI agents have been successfully initialized',
      priority: NotificationPriority.MEDIUM,
      channels: ['push', 'inApp'],
    },
    metadata: {
      sessionId: 'demo-session-1',
      userId: 'demo-user',
      projectId: 'demo-project',
    },
  };

  await orchestrator.sendMessage(notificationMessage);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log();

  // Example 4: Security check
  console.log('🔒 Example 4: Performing security check...');
  const securityAgent = orchestrator.getAgent(AgentType.SECURITY);
  if (securityAgent) {
    const securityMessage = {
      id: uuidv4(),
      type: MessageType.SECURITY_CHECK,
      source: AgentType.SECURITY,
      timestamp: new Date().toISOString(),
      payload: {
        operation: 'execute_code',
        userId: 'demo-user',
        data: { code: 'console.log("Hello World")' },
      },
      metadata: {
        sessionId: 'demo-session-1',
        userId: 'demo-user',
        projectId: 'demo-project',
      },
    };

    // Create a basic context
    const context = {
      sessionId: 'demo-session-1',
      userId: 'demo-user',
      projectId: 'demo-project',
      conversationHistory: [],
      userPreferences: orchestrator['defaultPreferences'],
      environment: orchestrator['environment'],
    };

    const result = await (securityAgent as any).handleMessage(securityMessage, context);
    console.log(`   Security check: ${result.success ? 'PASSED' : 'FAILED'}`);
    if (result.data) {
      console.log(`   Risk level: ${result.data.risk}`);
      console.log(`   Checks:`, result.data.checks);
    }
  }
  console.log();

  // Get orchestrator status
  const status = orchestrator.getStatus();
  console.log('📊 Orchestrator Status:');
  console.log(`   Initialized: ${status.initialized}`);
  console.log(`   Agent count: ${status.agentCount}`);
  console.log(`   Queue size: ${status.queueSize}`);
  console.log(`   Processing: ${status.processing}`);
  console.log();

  // Shutdown
  console.log('👋 Shutting down agents...');
  await orchestrator.shutdown();
  console.log('✅ Shutdown complete\n');
}

// Run the example
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
