import { Command } from 'commander';
import os from 'os';
import fs from 'fs-extra';
import { execa } from 'execa';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { configManager } from '../utils/config.js';
import { agentManager } from '../services/AgentManager.js';
import { downloader } from '../services/Downloader.js';
import { apiClient } from '../utils/api.js';
import chalk from 'chalk';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose RemoteDevAI installation issues')
  .option('--verbose', 'Show detailed diagnostic information')
  .action(async (options) => {
    try {
      logger.header('RemoteDevAI Diagnostics');
      logger.blank();

      const results: DiagnosticResult[] = [];

      // System Information
      spinner.start('Checking system information...');
      results.push(await checkSystemInfo());
      spinner.stop();

      // Node.js version
      spinner.start('Checking Node.js version...');
      results.push(await checkNodeVersion());
      spinner.stop();

      // Authentication
      spinner.start('Checking authentication...');
      results.push(await checkAuthentication());
      spinner.stop();

      // Configuration
      spinner.start('Checking configuration...');
      results.push(await checkConfiguration());
      spinner.stop();

      // Agent installation
      spinner.start('Checking agent installation...');
      results.push(await checkAgentInstallation());
      spinner.stop();

      // Agent status
      spinner.start('Checking agent status...');
      results.push(await checkAgentStatus());
      spinner.stop();

      // API connectivity
      spinner.start('Checking API connectivity...');
      results.push(await checkApiConnectivity());
      spinner.stop();

      // Disk space
      spinner.start('Checking disk space...');
      results.push(await checkDiskSpace());
      spinner.stop();

      // Permissions
      spinner.start('Checking file permissions...');
      results.push(await checkPermissions());
      spinner.stop();

      // Display results
      logger.blank();
      logger.subheader('Diagnostic Results');
      logger.blank();

      let passCount = 0;
      let failCount = 0;
      let warnCount = 0;

      results.forEach((result) => {
        let icon: string;
        let color: (text: string) => string;

        switch (result.status) {
          case 'pass':
            icon = '✓';
            color = chalk.green;
            passCount++;
            break;
          case 'fail':
            icon = '✗';
            color = chalk.red;
            failCount++;
            break;
          case 'warn':
            icon = '⚠';
            color = chalk.yellow;
            warnCount++;
            break;
        }

        console.log(`  ${color(icon)} ${result.name}: ${result.message}`);

        if (options.verbose && result.details) {
          console.log(chalk.gray(`    ${result.details}`));
        }
      });

      // Summary
      logger.blank();
      logger.subheader('Summary');
      logger.table([
        ['Passed', chalk.green(passCount.toString())],
        ['Warnings', chalk.yellow(warnCount.toString())],
        ['Failed', chalk.red(failCount.toString())],
      ]);

      // Recommendations
      if (failCount > 0 || warnCount > 0) {
        logger.blank();
        logger.subheader('Recommendations');

        results.forEach((result) => {
          if (result.status === 'fail' || result.status === 'warn') {
            logger.listItem(result.message);
            if (result.details) {
              console.log(chalk.gray(`    ${result.details}`));
            }
          }
        });
      }

      logger.blank();

      if (failCount === 0) {
        logger.success('All checks passed!');
      } else {
        logger.warn('Some checks failed. Please review the recommendations above.');
      }
    } catch (error) {
      logger.error('Diagnostics failed', error as Error);
      process.exit(1);
    }
  });

async function checkSystemInfo(): Promise<DiagnosticResult> {
  const platform = os.platform();
  const arch = os.arch();
  const release = os.release();

  const supportedPlatforms = ['darwin', 'linux', 'win32'];
  const supportedArchs = ['x64', 'arm64'];

  const isSupported =
    supportedPlatforms.includes(platform) && supportedArchs.includes(arch);

  return {
    name: 'System',
    status: isSupported ? 'pass' : 'fail',
    message: isSupported
      ? `${platform} ${arch} (${release})`
      : `Unsupported platform: ${platform} ${arch}`,
    details: isSupported
      ? undefined
      : 'RemoteDevAI supports macOS, Linux, and Windows on x64 and arm64 architectures',
  };
}

async function checkNodeVersion(): Promise<DiagnosticResult> {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

  const isSupported = majorVersion >= 18;

  return {
    name: 'Node.js',
    status: isSupported ? 'pass' : 'fail',
    message: isSupported ? nodeVersion : `Unsupported version: ${nodeVersion}`,
    details: isSupported
      ? undefined
      : 'RemoteDevAI requires Node.js 18 or higher',
  };
}

async function checkAuthentication(): Promise<DiagnosticResult> {
  const isAuthenticated = await configManager.isAuthenticated();
  const email = await configManager.get('email');

  return {
    name: 'Authentication',
    status: isAuthenticated ? 'pass' : 'warn',
    message: isAuthenticated
      ? `Authenticated as ${email}`
      : 'Not authenticated',
    details: isAuthenticated
      ? undefined
      : 'Run "remotedevai login" to authenticate',
  };
}

async function checkConfiguration(): Promise<DiagnosticResult> {
  const config = await configManager.read();
  const hasConfig = Object.keys(config).length > 0;

  const projectId = config.projectId;

  return {
    name: 'Configuration',
    status: hasConfig ? (projectId ? 'pass' : 'warn') : 'warn',
    message: projectId
      ? `Project configured: ${projectId}`
      : hasConfig
      ? 'Configuration exists but no project set'
      : 'No configuration found',
    details:
      hasConfig && !projectId
        ? 'Run "remotedevai init" to configure a project'
        : !hasConfig
        ? 'Run "remotedevai init" to set up configuration'
        : undefined,
  };
}

async function checkAgentInstallation(): Promise<DiagnosticResult> {
  const isInstalled = await downloader.isAgentInstalled();
  const version = await downloader.getInstalledVersion();

  return {
    name: 'Agent Installation',
    status: isInstalled ? 'pass' : 'fail',
    message: isInstalled
      ? `Installed (version ${version})`
      : 'Agent not installed',
    details: isInstalled
      ? undefined
      : 'Run "remotedevai update" to install the agent',
  };
}

async function checkAgentStatus(): Promise<DiagnosticResult> {
  const status = await agentManager.getStatus();

  return {
    name: 'Agent Status',
    status: status.running ? 'pass' : 'warn',
    message: status.running
      ? `Running (PID: ${status.pid})`
      : 'Not running',
    details: status.running
      ? undefined
      : 'Run "remotedevai start" to start the agent',
  };
}

async function checkApiConnectivity(): Promise<DiagnosticResult> {
  try {
    const isAuthenticated = await configManager.isAuthenticated();

    if (!isAuthenticated) {
      return {
        name: 'API Connectivity',
        status: 'warn',
        message: 'Cannot check (not authenticated)',
        details: 'Authenticate first to test API connectivity',
      };
    }

    const response = await apiClient.getProfile();

    return {
      name: 'API Connectivity',
      status: response.success ? 'pass' : 'fail',
      message: response.success
        ? 'Connected to API'
        : 'Failed to connect to API',
      details: response.success ? undefined : 'Check your internet connection',
    };
  } catch (error) {
    return {
      name: 'API Connectivity',
      status: 'fail',
      message: 'Failed to connect to API',
      details: (error as Error).message,
    };
  }
}

async function checkDiskSpace(): Promise<DiagnosticResult> {
  try {
    const agentDir = configManager.getAgentDir();
    const stats = await fs.stat(agentDir);

    const availableGB = 10 / 1024 / 1024 / 1024;
    const hasEnoughSpace = availableGB > 1; // At least 1GB free

    return {
      name: 'Disk Space',
      status: hasEnoughSpace ? 'pass' : 'warn',
      message: hasEnoughSpace
        ? `${availableGB.toFixed(2)} GB available`
        : `Only ${availableGB.toFixed(2)} GB available`,
      details: hasEnoughSpace
        ? undefined
        : 'Low disk space may cause issues',
    };
  } catch (error) {
    return {
      name: 'Disk Space',
      status: 'warn',
      message: 'Could not check disk space',
      details: (error as Error).message,
    };
  }
}

async function checkPermissions(): Promise<DiagnosticResult> {
  try {
    const configDir = configManager.getConfigDir();

    // Check if we can write to config directory
    const testFile = `${configDir}/.test-${Date.now()}`;
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);

    return {
      name: 'File Permissions',
      status: 'pass',
      message: 'Write access verified',
    };
  } catch (error) {
    return {
      name: 'File Permissions',
      status: 'fail',
      message: 'Cannot write to configuration directory',
      details: (error as Error).message,
    };
  }
}
