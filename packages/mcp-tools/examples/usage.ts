/**
 * MCP Tools Usage Examples
 *
 * This file demonstrates how to use various MCP tools
 */

import {
  // Screen Capture
  captureScreenshot,
  captureRegion,
  listDisplays,

  // Screen Recording
  startRecording,
  stopRecording,
  getRecordingStatus,

  // Browser Automation
  openBrowser,
  clickElement,
  typeText,
  takeScreenshot,
  closeBrowserTool,

  // Terminal
  captureTerminal,
  recordTerminal,
  getTerminalOutput,

  // File Preview
  previewFile,
  previewDirectory,
  previewDiff,

  // Notifications
  sendNotification,
  sendProgress,
  requestFeedback,

  // Video Tools
  compressVideo,
  createThumbnail,
  trimVideo,

  // Code Runner
  runCode,
  runTests,
  runBuild,
  lintCode,
  formatCode,
} from '../src/index.js';

/**
 * Example 1: Screen Capture
 */
async function screenCaptureExample() {
  console.log('=== Screen Capture Example ===');

  // List available displays
  const displays = await listDisplays();
  console.log('Available displays:', displays);

  // Capture full screen
  const screenshot = await captureScreenshot({
    display: 0,
    format: 'png',
    quality: 90,
  });
  console.log('Screenshot captured:', screenshot.success);

  // Capture specific region
  const region = await captureRegion({
    x: 100,
    y: 100,
    width: 800,
    height: 600,
    format: 'jpeg',
    quality: 85,
  });
  console.log('Region captured:', region.success);
}

/**
 * Example 2: Screen Recording
 */
async function screenRecordingExample() {
  console.log('=== Screen Recording Example ===');

  // Start recording
  const recording = await startRecording({
    fps: 30,
    quality: 'high',
    audio: false,
    maxDuration: 60,
  });
  console.log('Recording started:', recording.data);

  // Check status
  const status = await getRecordingStatus();
  console.log('Recording status:', status.data);

  // Wait 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Stop recording
  const stopped = await stopRecording();
  console.log('Recording saved:', stopped.data?.path);
}

/**
 * Example 3: Browser Automation
 */
async function browserAutomationExample() {
  console.log('=== Browser Automation Example ===');

  try {
    // Open browser
    await openBrowser({
      url: 'https://example.com',
      browser: 'chromium',
      headless: false,
      viewport: { width: 1920, height: 1080 },
    });
    console.log('Browser opened');

    // Click element
    await clickElement({
      selector: 'a',
      button: 'left',
    });
    console.log('Element clicked');

    // Type text
    await typeText({
      selector: 'input[type="text"]',
      text: 'Hello, World!',
      delay: 50,
    });
    console.log('Text typed');

    // Take screenshot
    const screenshot = await takeScreenshot({
      fullPage: true,
      format: 'png',
    });
    console.log('Screenshot taken:', screenshot.success);

    // Close browser
    await closeBrowserTool();
    console.log('Browser closed');
  } catch (error) {
    console.error('Browser automation error:', error);
  }
}

/**
 * Example 4: Terminal Capture
 */
async function terminalCaptureExample() {
  console.log('=== Terminal Capture Example ===');

  // Capture terminal
  const terminal = await captureTerminal({
    format: 'text',
    includePrompt: true,
  });
  console.log('Terminal captured:', terminal.success);

  // Record terminal session
  const recording = await recordTerminal({
    duration: 30,
    command: 'npm test',
  });
  console.log('Terminal recording started:', recording.data);

  // Get terminal output
  const output = await getTerminalOutput({
    lines: 50,
    format: 'text',
  });
  console.log('Terminal output:', output.data);
}

/**
 * Example 5: File Preview
 */
async function filePreviewExample() {
  console.log('=== File Preview Example ===');

  // Preview file
  const file = await previewFile({
    path: './package.json',
    format: 'text',
    maxLines: 50,
  });
  console.log('File preview:', file.success);

  // Preview directory
  const directory = await previewDirectory({
    path: './src',
    depth: 3,
    includeHidden: false,
  });
  console.log('Directory tree:', directory.data);

  // Preview diff
  const diff = await previewDiff({
    oldPath: './old-file.txt',
    newPath: './new-file.txt',
    format: 'unified',
  });
  console.log('Diff generated:', diff.success);
}

/**
 * Example 6: Notifications
 */
async function notificationExample() {
  console.log('=== Notification Example ===');

  // Send notification
  await sendNotification({
    title: 'Build Complete',
    message: 'Your project has been built successfully',
    priority: 'normal',
    sound: true,
  });
  console.log('Notification sent');

  // Send progress
  await sendProgress({
    taskId: 'build-123',
    progress: 75,
    message: 'Building project...',
    status: 'running',
  });
  console.log('Progress update sent');

  // Request feedback
  const feedback = await requestFeedback({
    question: 'Deploy to production?',
    options: ['Yes', 'No'],
    timeout: 30000,
  });
  console.log('Feedback received:', feedback.data);
}

/**
 * Example 7: Video Tools
 */
async function videoToolsExample() {
  console.log('=== Video Tools Example ===');

  // Compress video
  const compressed = await compressVideo({
    inputPath: './recording.mp4',
    quality: 'medium',
    resolution: '1280x720',
  });
  console.log('Video compressed:', compressed.data?.path);

  // Create thumbnail
  const thumbnail = await createThumbnail({
    videoPath: './recording.mp4',
    timestamp: 5,
    format: 'jpeg',
    width: 640,
    height: 360,
  });
  console.log('Thumbnail created:', thumbnail.success);

  // Trim video
  const trimmed = await trimVideo({
    inputPath: './recording.mp4',
    start: 10,
    end: 30,
  });
  console.log('Video trimmed:', trimmed.data?.path);
}

/**
 * Example 8: Code Runner
 */
async function codeRunnerExample() {
  console.log('=== Code Runner Example ===');

  // Run JavaScript code
  const jsResult = await runCode({
    code: 'console.log("Hello, World!"); return 42;',
    language: 'javascript',
    timeout: 5000,
  });
  console.log('JavaScript result:', jsResult.data);

  // Run TypeScript code
  const tsResult = await runCode({
    code: 'const msg: string = "TypeScript"; console.log(msg);',
    language: 'typescript',
    timeout: 5000,
  });
  console.log('TypeScript result:', tsResult.data);

  // Run tests
  const tests = await runTests({
    path: './tests',
    framework: 'jest',
    coverage: true,
  });
  console.log('Test results:', tests.success);

  // Run build
  const build = await runBuild({
    command: 'npm run build',
  });
  console.log('Build result:', build.success);

  // Lint code
  const lint = await lintCode({
    path: './src',
    fix: true,
  });
  console.log('Lint result:', lint.success);

  // Format code
  const format = await formatCode({
    path: './src',
    formatter: 'prettier',
    write: true,
  });
  console.log('Format result:', format.success);
}

/**
 * Example 9: Complete Workflow
 */
async function completeWorkflowExample() {
  console.log('=== Complete Workflow Example ===');

  try {
    // 1. Start screen recording
    const recording = await startRecording({
      fps: 30,
      quality: 'high',
    });
    console.log('Recording started');

    // 2. Open browser and navigate
    await openBrowser({
      url: 'https://github.com',
      browser: 'chromium',
      headless: false,
    });

    // 3. Perform actions
    await clickElement({ selector: 'input[name="q"]' });
    await typeText({
      selector: 'input[name="q"]',
      text: 'RemoteDevAI',
      delay: 100,
    });

    // 4. Take screenshot
    const screenshot = await takeScreenshot({
      fullPage: false,
      format: 'png',
    });
    console.log('Screenshot captured');

    // 5. Close browser
    await closeBrowserTool();

    // 6. Stop recording
    const video = await stopRecording();
    console.log('Recording saved:', video.data?.path);

    // 7. Create thumbnail
    if (video.data?.path) {
      const thumbnail = await createThumbnail({
        videoPath: video.data.path,
        timestamp: 5,
        format: 'jpeg',
      });
      console.log('Thumbnail created');
    }

    // 8. Send notification
    await sendNotification({
      title: 'Workflow Complete',
      message: 'Browser automation and recording finished',
      priority: 'normal',
    });
  } catch (error) {
    console.error('Workflow error:', error);
  }
}

/**
 * Run all examples
 */
async function main() {
  console.log('MCP Tools Usage Examples\n');

  const examples = [
    { name: 'Screen Capture', fn: screenCaptureExample },
    { name: 'Screen Recording', fn: screenRecordingExample },
    { name: 'Browser Automation', fn: browserAutomationExample },
    { name: 'Terminal Capture', fn: terminalCaptureExample },
    { name: 'File Preview', fn: filePreviewExample },
    { name: 'Notifications', fn: notificationExample },
    { name: 'Video Tools', fn: videoToolsExample },
    { name: 'Code Runner', fn: codeRunnerExample },
    { name: 'Complete Workflow', fn: completeWorkflowExample },
  ];

  for (const example of examples) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Running: ${example.name}`);
      console.log('='.repeat(50));
      await example.fn();
      console.log(`✓ ${example.name} completed\n`);
    } catch (error) {
      console.error(`✗ ${example.name} failed:`, error);
    }
  }

  console.log('\nAll examples completed!');
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
