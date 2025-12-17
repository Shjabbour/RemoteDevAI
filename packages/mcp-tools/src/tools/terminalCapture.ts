/**
 * Terminal capture tools
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import {
  ToolResponse,
  ImageData,
  CaptureTerminalParams,
  RecordTerminalParams,
  GetTerminalOutputParams,
} from '../types.js';

interface TerminalSession {
  process: ChildProcess;
  output: string[];
  startTime: Date;
}

const terminalSessions = new Map<string, TerminalSession>();

/**
 * Capture terminal screenshot
 *
 * @example
 * const result = await captureTerminal({
 *   format: 'png',
 *   includePrompt: true
 * });
 */
export async function captureTerminal(
  params: CaptureTerminalParams
): Promise<ToolResponse<ImageData>> {
  try {
    const { format = 'png', includePrompt = true } = params;

    // Use screenshot-desktop to capture terminal window
    // This is a simplified implementation - in production you'd need
    // window detection to find the terminal window
    const screenshot = (await import('screenshot-desktop')).default;
    const buffer = await screenshot();

    if (format === 'text') {
      // Return terminal output as text
      const output = await getTerminalOutput({ lines: 50, format: 'text' });

      if (!output.success || !output.data) {
        throw new Error('Failed to get terminal output');
      }

      const textBuffer = Buffer.from(output.data as string, 'utf-8');

      return {
        success: true,
        data: {
          base64: textBuffer.toString('base64'),
          mimeType: 'text/plain',
          width: 0,
          height: 0,
          size: textBuffer.length,
        },
        message: 'Terminal output captured',
      };
    }

    // Process image with sharp
    const sharp = (await import('sharp')).default;
    let image = sharp(buffer);

    if (format === 'jpeg') {
      image = image.jpeg({ quality: 90 });
    } else {
      image = image.png();
    }

    const outputBuffer = await image.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      text: 'text/plain',
    };

    return {
      success: true,
      data: {
        base64: outputBuffer.toString('base64'),
        mimeType: mimeTypes[format],
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: outputBuffer.length,
      },
      message: 'Terminal captured',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture terminal',
      message: 'Terminal capture failed',
    };
  }
}

/**
 * Record terminal session
 *
 * @example
 * const result = await recordTerminal({
 *   duration: 60,
 *   command: 'npm test'
 * });
 */
export async function recordTerminal(
  params: RecordTerminalParams
): Promise<ToolResponse<{ sessionId: string; outputPath: string }>> {
  try {
    const { duration, command } = params;

    const sessionId = `term-${Date.now()}`;
    const outputDir = path.join(process.cwd(), 'recordings');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${sessionId}.txt`);

    if (command) {
      // Execute command and capture output
      const shell = process.platform === 'win32' ? 'cmd' : 'bash';
      const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];

      const proc = spawn(shell, shellArgs);
      const output: string[] = [];

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        process.stdout.write(text);
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        process.stderr.write(text);
      });

      const session: TerminalSession = {
        process: proc,
        output,
        startTime: new Date(),
      };

      terminalSessions.set(sessionId, session);

      // Auto-stop after duration
      setTimeout(async () => {
        if (terminalSessions.has(sessionId)) {
          proc.kill();
          await fs.writeFile(outputPath, output.join(''));
          terminalSessions.delete(sessionId);
        }
      }, duration * 1000);

      proc.on('close', async () => {
        await fs.writeFile(outputPath, output.join(''));
        terminalSessions.delete(sessionId);
      });
    }

    return {
      success: true,
      data: {
        sessionId,
        outputPath,
      },
      message: command
        ? `Recording terminal session for command: ${command}`
        : 'Recording terminal session',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record terminal',
      message: 'Terminal recording failed',
    };
  }
}

/**
 * Get recent terminal output
 *
 * @example
 * const result = await getTerminalOutput({
 *   lines: 100,
 *   format: 'text'
 * });
 */
export async function getTerminalOutput(
  params: GetTerminalOutputParams
): Promise<ToolResponse<string | object>> {
  try {
    const { lines = 100, format = 'text' } = params;

    // Get the most recent terminal session
    const sessions = Array.from(terminalSessions.values());
    if (sessions.length === 0) {
      return {
        success: true,
        data: format === 'json' ? { output: [] } : '',
        message: 'No active terminal sessions',
      };
    }

    const session = sessions[sessions.length - 1];
    const recentOutput = session.output.slice(-lines);

    switch (format) {
      case 'json':
        return {
          success: true,
          data: {
            output: recentOutput,
            lineCount: recentOutput.length,
            startTime: session.startTime,
          },
          message: `Retrieved ${recentOutput.length} lines`,
        };

      case 'html':
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <pre>${recentOutput.join('').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>
        `.trim();

        return {
          success: true,
          data: html,
          message: `Retrieved ${recentOutput.length} lines as HTML`,
        };

      case 'text':
      default:
        return {
          success: true,
          data: recentOutput.join(''),
          message: `Retrieved ${recentOutput.length} lines`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get terminal output',
      message: 'Output retrieval failed',
    };
  }
}

/**
 * Stop terminal recording
 *
 * @example
 * await stopTerminalRecording({ sessionId: 'term-123' });
 */
export async function stopTerminalRecording(params: {
  sessionId: string;
}): Promise<ToolResponse<{ output: string; lines: number }>> {
  try {
    const session = terminalSessions.get(params.sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
        message: `No session with ID: ${params.sessionId}`,
      };
    }

    session.process.kill();

    const output = session.output.join('');
    terminalSessions.delete(params.sessionId);

    return {
      success: true,
      data: {
        output,
        lines: session.output.length,
      },
      message: `Terminal recording stopped (${session.output.length} lines)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop recording',
      message: 'Stop failed',
    };
  }
}

/**
 * List active terminal sessions
 *
 * @example
 * const sessions = await listTerminalSessions();
 */
export async function listTerminalSessions(): Promise<ToolResponse<{
  sessions: Array<{ id: string; startTime: Date; lineCount: number }>;
}>> {
  try {
    const sessions = Array.from(terminalSessions.entries()).map(([id, session]) => ({
      id,
      startTime: session.startTime,
      lineCount: session.output.length,
    }));

    return {
      success: true,
      data: { sessions },
      message: `Found ${sessions.length} active session(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions',
      message: 'List failed',
    };
  }
}
