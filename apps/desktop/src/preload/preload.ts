import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Exposes safe IPC methods to renderer process
 * Implements security best practices with contextIsolation
 */

// Define API interface
interface RemoteDevAIAPI {
  // Auth
  auth: {
    getToken: () => Promise<string | null>;
    setToken: (token: string) => Promise<void>;
    clearToken: () => Promise<void>;
    getDeviceId: () => Promise<string>;
  };

  // Connection
  connection: {
    getStatus: () => Promise<any>;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    getStats: () => Promise<any>;
  };

  // Claude Code
  claude: {
    start: (options?: any) => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<any>;
    executeCommand: (command: string) => Promise<string>;
  };

  // Terminal
  terminal: {
    create: (options?: any) => Promise<any>;
    write: (terminalId: string, data: string) => Promise<void>;
    resize: (terminalId: string, cols: number, rows: number) => Promise<void>;
    kill: (terminalId: string) => Promise<void>;
    list: () => Promise<any[]>;
  };

  // Recording
  recording: {
    start: (options?: any) => Promise<any>;
    stop: () => Promise<any>;
    getStatus: () => Promise<any>;
    listRecordings: () => Promise<any[]>;
    deleteRecording: (recordingId: string) => Promise<void>;
  };

  // File Watcher
  fileWatcher: {
    start: (paths: string[]) => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<any>;
    addPath: (path: string) => Promise<void>;
    removePath: (path: string) => Promise<void>;
  };

  // Tunnel
  tunnel: {
    start: (options?: any) => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<any>;
    getUrl: () => Promise<string | null>;
  };

  // Updates
  update: {
    check: () => Promise<any>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    getInfo: () => Promise<any>;
  };

  // App
  app: {
    getVersion: () => Promise<string>;
    getConfig: () => Promise<any>;
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
  };

  // Logs
  logs: {
    get: (options?: { limit?: number; level?: string }) => Promise<any[]>;
    clear: () => Promise<void>;
  };

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

// Expose API to renderer
const api: RemoteDevAIAPI = {
  // Auth
  auth: {
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    setToken: (token: string) => ipcRenderer.invoke('auth:setToken', token),
    clearToken: () => ipcRenderer.invoke('auth:clearToken'),
    getDeviceId: () => ipcRenderer.invoke('auth:getDeviceId'),
  },

  // Connection
  connection: {
    getStatus: () => ipcRenderer.invoke('connection:getStatus'),
    connect: () => ipcRenderer.invoke('connection:connect'),
    disconnect: () => ipcRenderer.invoke('connection:disconnect'),
    getStats: () => ipcRenderer.invoke('connection:getStats'),
  },

  // Claude Code
  claude: {
    start: (options) => ipcRenderer.invoke('claude:start', options),
    stop: () => ipcRenderer.invoke('claude:stop'),
    getStatus: () => ipcRenderer.invoke('claude:getStatus'),
    executeCommand: (command) => ipcRenderer.invoke('claude:executeCommand', command),
  },

  // Terminal
  terminal: {
    create: (options) => ipcRenderer.invoke('terminal:create', options),
    write: (terminalId, data) => ipcRenderer.invoke('terminal:write', terminalId, data),
    resize: (terminalId, cols, rows) =>
      ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
    kill: (terminalId) => ipcRenderer.invoke('terminal:kill', terminalId),
    list: () => ipcRenderer.invoke('terminal:list'),
  },

  // Recording
  recording: {
    start: (options) => ipcRenderer.invoke('recording:start', options),
    stop: () => ipcRenderer.invoke('recording:stop'),
    getStatus: () => ipcRenderer.invoke('recording:getStatus'),
    listRecordings: () => ipcRenderer.invoke('recording:listRecordings'),
    deleteRecording: (recordingId) => ipcRenderer.invoke('recording:deleteRecording', recordingId),
  },

  // File Watcher
  fileWatcher: {
    start: (paths) => ipcRenderer.invoke('fileWatcher:start', paths),
    stop: () => ipcRenderer.invoke('fileWatcher:stop'),
    getStatus: () => ipcRenderer.invoke('fileWatcher:getStatus'),
    addPath: (path) => ipcRenderer.invoke('fileWatcher:addPath', path),
    removePath: (path) => ipcRenderer.invoke('fileWatcher:removePath', path),
  },

  // Tunnel
  tunnel: {
    start: (options) => ipcRenderer.invoke('tunnel:start', options),
    stop: () => ipcRenderer.invoke('tunnel:stop'),
    getStatus: () => ipcRenderer.invoke('tunnel:getStatus'),
    getUrl: () => ipcRenderer.invoke('tunnel:getUrl'),
  },

  // Updates
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    getInfo: () => ipcRenderer.invoke('update:getInfo'),
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getConfig: () => ipcRenderer.invoke('app:getConfig'),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
    showItemInFolder: (path) => ipcRenderer.invoke('app:showItemInFolder', path),
  },

  // Logs
  logs: {
    get: (options) => ipcRenderer.invoke('logs:get', options),
    clear: () => ipcRenderer.invoke('logs:clear'),
  },

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// Expose API to window
contextBridge.exposeInMainWorld('remoteDevAI', api);

// Type declaration for TypeScript
declare global {
  interface Window {
    remoteDevAI: RemoteDevAIAPI;
  }
}
