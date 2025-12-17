/**
 * MCP Tools Package
 * Export all tools and server
 */

// Export server
export { startMCPServer } from './server.js';

// Export types
export * from './types.js';

// Export screen capture tools
export {
  captureScreenshot,
  captureRegion,
  listDisplays,
  captureAllDisplays,
  captureToFile,
} from './tools/screenCapture.js';

// Export screen recording tools
export {
  startRecording,
  stopRecording,
  getRecordingStatus,
  pauseRecording,
  cancelRecording,
} from './tools/screenRecord.js';

// Export browser automation tools
export {
  openBrowser,
  clickElement,
  typeText,
  takeScreenshot,
  recordBrowser,
  closeBrowserTool,
  navigate,
  getPageContent,
  executeJavaScript,
  fillFormFields,
  getElementTextContent,
} from './tools/browserAutomation.js';

// Export terminal capture tools
export {
  captureTerminal,
  recordTerminal,
  getTerminalOutput,
  stopTerminalRecording,
  listTerminalSessions,
} from './tools/terminalCapture.js';

// Export file preview tools
export {
  previewFile,
  previewDiff,
  previewDirectory,
  getFileMetadata,
} from './tools/filePreview.js';

// Export notification tools
export {
  sendNotification,
  sendProgress,
  requestFeedback,
  cancelFeedbackRequest,
  sendWebhook,
  sendBatchNotifications,
} from './tools/notification.js';

// Export video tools
export {
  compressVideo,
  createThumbnail,
  trimVideo,
  addTimestamp,
  convertVideoFormat,
  mergeVideos,
  extractVideoAudio,
  getVideoInfo,
} from './tools/videoTools.js';

// Export code runner tools
export {
  runCode,
  runTests,
  runBuild,
  getOutput,
  installDeps,
  lintCode,
  formatCode,
  checkRuntime,
  typeCheck,
} from './tools/codeRunner.js';

// Export utilities
export * from './utils/ffmpeg.js';
export * from './utils/playwright.js';
export * from './utils/sandbox.js';
