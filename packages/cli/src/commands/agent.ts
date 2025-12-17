import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { agentManager } from '../services/AgentManager.js';
import { configManager } from '../utils/config.js';
import { downloader } from '../services/Downloader.js';
import chalk from 'chalk';

export const startCommand = new Command('start')
  .description('Start the desktop agent')
  .option('-d, --detached', 'Run agent in background (detached mode)', true)
  .option('-f, --foreground', 'Run agent in foreground')
  .action(async (options) => {
    try {
      // Check authentication
      const isAuthenticated = await configManager.isAuthenticated();
      if (!isAuthenticated) {
        logger.error('Not authenticated. Please login first.');
        logger.info('Run: remotedevai login');
        process.exit(1);
      }

      // Check if agent is installed
      const isInstalled = await downloader.isAgentInstalled();
      if (!isInstalled) {
        logger.error('Desktop agent not installed.');
        logger.info('Run: remotedevai update');
        process.exit(1);
      }

      // Check if already running
      const isRunning = await agentManager.isRunning();
      if (isRunning) {
        logger.warn('Agent is already running');
        logger.info('Use "remotedevai stop" to stop it first');
        return;
      }

      const detached = options.foreground ? false : options.detached;

      if (detached) {
        spinner.start('Starting agent...');
        await agentManager.start({ detached: true });
        spinner.succeed('Agent started in background');

        logger.blank();
        logger.info('View logs: remotedevai logs');
        logger.info('Check status: remotedevai status');
      } else {
        logger.info('Starting agent in foreground mode...');
        logger.info('Press Ctrl+C to stop');
        logger.blank();

        await agentManager.start({ detached: false });
      }
    } catch (error) {
      if (spinner.isSpinning()) {
        spinner.fail('Failed to start agent');
      }
      logger.error('Failed to start agent', error as Error);
      process.exit(1);
    }
  });

export const stopCommand = new Command('stop')
  .description('Stop the desktop agent')
  .action(async () => {
    try {
      const isRunning = await agentManager.isRunning();
      if (!isRunning) {
        logger.info('Agent is not running');
        return;
      }

      spinner.start('Stopping agent...');
      await agentManager.stop();
      spinner.succeed('Agent stopped');
    } catch (error) {
      if (spinner.isSpinning()) {
        spinner.fail('Failed to stop agent');
      }
      logger.error('Failed to stop agent', error as Error);
      process.exit(1);
    }
  });

export const restartCommand = new Command('restart')
  .description('Restart the desktop agent')
  .option('-d, --detached', 'Run agent in background (detached mode)', true)
  .option('-f, --foreground', 'Run agent in foreground')
  .action(async (options) => {
    try {
      const detached = options.foreground ? false : options.detached;

      spinner.start('Restarting agent...');
      await agentManager.restart({ detached });
      spinner.succeed('Agent restarted');

      if (detached) {
        logger.blank();
        logger.info('View logs: remotedevai logs');
        logger.info('Check status: remotedevai status');
      }
    } catch (error) {
      if (spinner.isSpinning()) {
        spinner.fail('Failed to restart agent');
      }
      logger.error('Failed to restart agent', error as Error);
      process.exit(1);
    }
  });

export const statusCommand = new Command('status')
  .description('Check desktop agent status')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const status = await agentManager.getStatus();
      const config = await configManager.read();

      if (options.json) {
        console.log(JSON.stringify({ status, config }, null, 2));
        return;
      }

      logger.header('RemoteDevAI Status');

      // Authentication status
      logger.subheader('Authentication');
      if (config.email) {
        logger.table([
          ['Email', config.email],
          ['Status', chalk.green('Authenticated')],
        ]);
      } else {
        logger.table([
          ['Status', chalk.red('Not authenticated')],
        ]);
      }

      // Project status
      if (config.projectId) {
        logger.subheader('Project');
        logger.table([
          ['Project ID', config.projectId],
        ]);
      }

      // Agent status
      logger.subheader('Desktop Agent');
      if (status.running) {
        const uptimeStr = status.uptime
          ? formatUptime(status.uptime)
          : 'Unknown';

        logger.table([
          ['Status', chalk.green('Running')],
          ['PID', status.pid?.toString() || 'Unknown'],
          ['Version', status.version || 'Unknown'],
          ['Uptime', uptimeStr],
        ]);
      } else {
        logger.table([
          ['Status', chalk.red('Not running')],
          ['Version', status.version || await downloader.getInstalledVersion() || 'Not installed'],
        ]);
      }

      // Configuration
      logger.subheader('Configuration');
      logger.table([
        ['Config Dir', configManager.getConfigDir()],
        ['Agent Dir', configManager.getAgentDir()],
        ['Logs Dir', configManager.getLogsDir()],
      ]);

      logger.blank();
    } catch (error) {
      logger.error('Failed to get status', error as Error);
      process.exit(1);
    }
  });

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
