/**
 * Code execution and build tools
 */

import {
  executeInSandbox,
  runTests as sandboxRunTests,
  runBuild as sandboxRunBuild,
  installDependencies,
  commandExists,
  getRuntimeVersion,
} from '../utils/sandbox.js';

import {
  ToolResponse,
  ExecutionResult,
  RunCodeParams,
  RunTestsParams,
  RunBuildParams,
} from '../types.js';

/**
 * Execute code in sandbox
 *
 * @example
 * const result = await runCode({
 *   code: 'console.log("Hello, World!")',
 *   language: 'javascript',
 *   timeout: 5000
 * });
 */
export async function runCode(
  params: RunCodeParams
): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { code, language, timeout = 30000, sandbox = true, env = {} } = params;

    // Validate language support
    const supportedLanguages = ['javascript', 'typescript', 'python', 'bash'];
    if (!supportedLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Check if runtime is available
    const runtimeMap = {
      javascript: 'node',
      typescript: 'tsx',
      python: 'python',
      bash: 'bash',
    };

    const runtime = runtimeMap[language];
    const hasRuntime = await commandExists(runtime);

    if (!hasRuntime) {
      throw new Error(`Runtime not found: ${runtime}`);
    }

    // Execute code
    const result = await executeInSandbox(code, language, {
      timeout,
      env,
    });

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? 'Code executed successfully'
          : `Code execution failed with exit code ${result.exitCode}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute code',
      message: 'Code execution failed',
    };
  }
}

/**
 * Run tests
 *
 * @example
 * const result = await runTests({
 *   path: './tests',
 *   framework: 'jest',
 *   coverage: true
 * });
 */
export async function runTests(
  params: RunTestsParams
): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { path, framework = 'jest', coverage = false, watch = false } = params;

    // Run tests
    const result = await sandboxRunTests(path, framework, {
      coverage,
      watch,
    });

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? `Tests passed${coverage ? ' with coverage' : ''}`
          : `Tests failed with exit code ${result.exitCode}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run tests',
      message: 'Test execution failed',
    };
  }
}

/**
 * Run build command
 *
 * @example
 * const result = await runBuild({
 *   command: 'npm run build',
 *   cwd: './my-project'
 * });
 */
export async function runBuild(
  params: RunBuildParams
): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { command = 'npm run build', cwd, env = {} } = params;

    // Run build
    const result = await sandboxRunBuild(command, {
      cwd,
      env,
    });

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? 'Build completed successfully'
          : `Build failed with exit code ${result.exitCode}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run build',
      message: 'Build failed',
    };
  }
}

/**
 * Get execution output
 *
 * @example
 * const output = await getOutput({ executionId: 'exec-123' });
 */
export async function getOutput(params: {
  executionId: string;
}): Promise<ToolResponse<{ stdout: string; stderr: string }>> {
  try {
    // This would typically retrieve output from a stored execution
    // For now, return a placeholder
    return {
      success: false,
      error: 'Not implemented',
      message: 'Output retrieval not yet implemented',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get output',
      message: 'Output retrieval failed',
    };
  }
}

/**
 * Install project dependencies
 *
 * @example
 * const result = await installDeps({
 *   packageManager: 'npm',
 *   cwd: './my-project'
 * });
 */
export async function installDeps(params: {
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  cwd?: string;
}): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { packageManager = 'npm', cwd } = params;

    const result = await installDependencies(packageManager, cwd);

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? 'Dependencies installed successfully'
          : `Installation failed with exit code ${result.exitCode}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install dependencies',
      message: 'Installation failed',
    };
  }
}

/**
 * Lint code
 *
 * @example
 * const result = await lintCode({
 *   path: './src',
 *   fix: true
 * });
 */
export async function lintCode(params: {
  path: string;
  fix?: boolean;
  config?: string;
}): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { path, fix = false, config } = params;

    const args = ['eslint', path];
    if (fix) args.push('--fix');
    if (config) args.push('--config', config);

    const command = args.join(' ');

    const result = await sandboxRunBuild(command);

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? `Linting passed${fix ? ' with fixes applied' : ''}`
          : `Linting failed with ${result.exitCode} issue(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to lint code',
      message: 'Linting failed',
    };
  }
}

/**
 * Format code
 *
 * @example
 * const result = await formatCode({
 *   path: './src',
 *   formatter: 'prettier'
 * });
 */
export async function formatCode(params: {
  path: string;
  formatter?: 'prettier' | 'black' | 'rustfmt';
  write?: boolean;
}): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { path, formatter = 'prettier', write = true } = params;

    let command: string;

    switch (formatter) {
      case 'prettier':
        command = `prettier ${write ? '--write' : '--check'} "${path}"`;
        break;
      case 'black':
        command = `black ${write ? '' : '--check'} "${path}"`;
        break;
      case 'rustfmt':
        command = `rustfmt ${write ? '' : '--check'} "${path}"`;
        break;
      default:
        throw new Error(`Unsupported formatter: ${formatter}`);
    }

    const result = await sandboxRunBuild(command);

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? `Code formatted with ${formatter}`
          : `Formatting failed with exit code ${result.exitCode}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to format code',
      message: 'Formatting failed',
    };
  }
}

/**
 * Check runtime availability
 *
 * @example
 * const result = await checkRuntime({ runtime: 'node' });
 */
export async function checkRuntime(params: {
  runtime: string;
}): Promise<ToolResponse<{ available: boolean; version: string | null }>> {
  try {
    const available = await commandExists(params.runtime);
    const version = available ? await getRuntimeVersion(params.runtime) : null;

    return {
      success: true,
      data: {
        available,
        version,
      },
      message: available
        ? `${params.runtime} is available (${version})`
        : `${params.runtime} is not available`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check runtime',
      message: 'Runtime check failed',
    };
  }
}

/**
 * Run type checking
 *
 * @example
 * const result = await typeCheck({ path: './src' });
 */
export async function typeCheck(params: {
  path: string;
  config?: string;
}): Promise<ToolResponse<ExecutionResult>> {
  try {
    const { path, config } = params;

    const args = ['tsc', '--noEmit'];
    if (config) args.push('--project', config);

    const command = args.join(' ');

    const result = await sandboxRunBuild(command, { cwd: path });

    return {
      success: result.exitCode === 0,
      data: result,
      message:
        result.exitCode === 0
          ? 'Type checking passed'
          : `Type checking failed with ${result.exitCode} error(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to type check',
      message: 'Type checking failed',
    };
  }
}
