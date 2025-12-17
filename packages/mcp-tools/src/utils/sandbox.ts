/**
 * Code execution sandbox utilities
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

export interface SandboxOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  maxBuffer?: number;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  error?: string;
}

/**
 * Execute code in a sandboxed environment
 *
 * @example
 * const result = await executeInSandbox('console.log("Hello")', 'javascript', {
 *   timeout: 5000
 * });
 */
export async function executeInSandbox(
  code: string,
  language: 'javascript' | 'typescript' | 'python' | 'bash',
  options: SandboxOptions = {}
): Promise<SandboxResult> {
  const { timeout = 30000, cwd, env = {}, maxBuffer = 1024 * 1024 * 10 } = options;

  const startTime = Date.now();

  try {
    let command: string;
    let args: string[];
    let tempFile: string | null = null;

    switch (language) {
      case 'javascript':
        command = 'node';
        args = ['-e', code];
        break;

      case 'typescript':
        // Use tsx or ts-node
        tempFile = await createTempFile(code, '.ts');
        command = 'tsx';
        args = [tempFile];
        break;

      case 'python':
        command = 'python';
        args = ['-c', code];
        break;

      case 'bash':
        command = 'bash';
        args = ['-c', code];
        break;

      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    const result = await executeCommand(command, args, {
      timeout,
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      maxBuffer,
    });

    // Cleanup temp file
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {});
    }

    const duration = Date.now() - startTime;

    return {
      ...result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute command with timeout
 */
async function executeCommand(
  command: string,
  args: string[],
  options: {
    timeout: number;
    cwd: string;
    env: Record<string, string>;
    maxBuffer: number;
  }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      timeout: options.timeout,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > options.maxBuffer) {
        child.kill();
        reject(new Error('Output exceeded maximum buffer size'));
      }
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > options.maxBuffer) {
        child.kill();
        reject(new Error('Error output exceeded maximum buffer size'));
      }
    });

    const timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error('Execution timeout'));
    }, options.timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Create temporary file with content
 */
async function createTempFile(content: string, extension: string): Promise<string> {
  const tempDir = os.tmpdir();
  const fileName = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const filePath = path.join(tempDir, fileName);

  await fs.writeFile(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Run tests using specified framework
 *
 * @example
 * const result = await runTests('./tests', 'jest', {
 *   coverage: true
 * });
 */
export async function runTests(
  testPath: string,
  framework: 'jest' | 'mocha' | 'pytest' | 'vitest' = 'jest',
  options: {
    coverage?: boolean;
    watch?: boolean;
    timeout?: number;
    env?: Record<string, string>;
  } = {}
): Promise<SandboxResult> {
  const { coverage = false, watch = false, timeout = 60000, env = {} } = options;

  const startTime = Date.now();

  let command: string;
  let args: string[] = [];

  switch (framework) {
    case 'jest':
      command = 'npm';
      args = ['run', 'test'];
      if (coverage) args.push('--', '--coverage');
      if (watch) args.push('--', '--watch');
      args.push(testPath);
      break;

    case 'mocha':
      command = 'mocha';
      args = [testPath];
      break;

    case 'pytest':
      command = 'pytest';
      args = [testPath];
      if (coverage) args.push('--cov');
      break;

    case 'vitest':
      command = 'vitest';
      args = ['run', testPath];
      if (coverage) args.push('--coverage');
      if (watch) args.push('--watch');
      break;

    default:
      throw new Error(`Unsupported test framework: ${framework}`);
  }

  try {
    const result = await executeCommand(command, args, {
      timeout,
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 10,
    });

    const duration = Date.now() - startTime;

    return {
      ...result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run build command
 *
 * @example
 * const result = await runBuild('npm run build', {
 *   cwd: './my-project'
 * });
 */
export async function runBuild(
  command: string,
  options: SandboxOptions = {}
): Promise<SandboxResult> {
  const { timeout = 120000, cwd, env = {} } = options;

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      timeout,
      maxBuffer: 1024 * 1024 * 10,
    });

    const duration = Date.now() - startTime;

    return {
      stdout,
      stderr,
      exitCode: 0,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
      duration,
      error: error.message,
    };
  }
}

/**
 * Install dependencies
 *
 * @example
 * await installDependencies('npm', './my-project');
 */
export async function installDependencies(
  packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm',
  cwd?: string,
  timeout: number = 300000
): Promise<SandboxResult> {
  const commands = {
    npm: 'npm install',
    yarn: 'yarn install',
    pnpm: 'pnpm install',
  };

  return await runBuild(commands[packageManager], { cwd, timeout });
}

/**
 * Check if command exists
 *
 * @example
 * const hasNode = await commandExists('node');
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const checkCommand = process.platform === 'win32'
      ? `where ${command}`
      : `which ${command}`;

    await execAsync(checkCommand);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get runtime version
 *
 * @example
 * const version = await getRuntimeVersion('node');
 */
export async function getRuntimeVersion(runtime: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${runtime} --version`);
    return stdout.trim();
  } catch {
    return null;
  }
}
