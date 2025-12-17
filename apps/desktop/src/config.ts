import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  // Application
  appName: string;
  appVersion: string;
  isDevelopment: boolean;
  isProduction: boolean;
  userDataPath: string;
  logsPath: string;

  // Cloud Connection
  cloudApiUrl: string;
  cloudWsUrl: string;

  // Claude Code CLI
  claudeCodePath: string;
  claudeCodeWorkspace: string;

  // Recording
  recordingsPath: string;
  maxRecordingSize: number; // in MB
  recordingQuality: 'low' | 'medium' | 'high';

  // Security
  encryptionEnabled: boolean;

  // Auto-launch
  autoLaunchEnabled: boolean;

  // Updates
  autoUpdateEnabled: boolean;
  updateCheckInterval: number; // in hours

  // Tunnel
  tunnelProvider: 'cloudflare' | 'ngrok' | 'none';
  tunnelAuthToken?: string;

  // File Watching
  watchIgnorePatterns: string[];
  watchDebounceMs: number;
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const userDataPath = app.getPath('userData');
const logsPath = path.join(userDataPath, 'logs');

// Ensure directories exist
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

const recordingsPath = path.join(userDataPath, 'recordings');
if (!fs.existsSync(recordingsPath)) {
  fs.mkdirSync(recordingsPath, { recursive: true });
}

export const config: Config = {
  // Application
  appName: 'RemoteDevAI',
  appVersion: app.getVersion(),
  isDevelopment,
  isProduction: !isDevelopment,
  userDataPath,
  logsPath,

  // Cloud Connection
  cloudApiUrl: process.env.CLOUD_API_URL || 'http://localhost:3000',
  cloudWsUrl: process.env.CLOUD_WS_URL || 'ws://localhost:3000',

  // Claude Code CLI
  claudeCodePath: process.env.CLAUDE_CODE_PATH || 'claude',
  claudeCodeWorkspace: process.env.CLAUDE_CODE_WORKSPACE || process.cwd(),

  // Recording
  recordingsPath,
  maxRecordingSize: parseInt(process.env.MAX_RECORDING_SIZE || '100', 10),
  recordingQuality: (process.env.RECORDING_QUALITY as 'low' | 'medium' | 'high') || 'medium',

  // Security
  encryptionEnabled: process.env.ENCRYPTION_ENABLED !== 'false',

  // Auto-launch
  autoLaunchEnabled: process.env.AUTO_LAUNCH_ENABLED !== 'false',

  // Updates
  autoUpdateEnabled: process.env.AUTO_UPDATE_ENABLED !== 'false',
  updateCheckInterval: parseInt(process.env.UPDATE_CHECK_INTERVAL || '24', 10),

  // Tunnel
  tunnelProvider: (process.env.TUNNEL_PROVIDER as 'cloudflare' | 'ngrok' | 'none') || 'none',
  tunnelAuthToken: process.env.TUNNEL_AUTH_TOKEN,

  // File Watching
  watchIgnorePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.cache/**',
    '**/*.log',
  ],
  watchDebounceMs: parseInt(process.env.WATCH_DEBOUNCE_MS || '300', 10),
};

export default config;
