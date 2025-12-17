import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { agentManager } from '../services/AgentManager.js';
import { configManager } from '../utils/config.js';
import chalk from 'chalk';
import { execa } from 'execa';

export const logsCommand = new Command('logs')
  .description('View agent logs')
  .option('-f, --follow', 'Follow log output (tail -f)')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('--level <level>', 'Filter by log level (debug|info|warn|error)')
  .option('--grep <pattern>', 'Filter logs by pattern')
  .option('--cli', 'Show CLI logs instead of agent logs')
  .action(async (options) => {
    try {
      let logFile: string | null;

      if (options.cli) {
        // Show CLI logs
        const logsDir = configManager.getLogsDir();
        const files = await fs.readdir(logsDir);
        const logFiles = files.filter(f => f.startsWith('cli-') && f.endsWith('.log')).sort().reverse();

        if (logFiles.length === 0) {
          logger.info('No CLI logs found');
          return;
        }

        logFile = path.join(logsDir, logFiles[0]);
      } else {
        // Show agent logs
        logFile = await agentManager.getLatestLogFile();

        if (!logFile) {
          logger.info('No agent logs found');
          logger.info('Start the agent to generate logs: remotedevai start');
          return;
        }
      }

      if (!(await fs.pathExists(logFile))) {
        logger.error('Log file not found');
        return;
      }

      const numLines = parseInt(options.lines, 10);

      if (options.follow) {
        // Follow logs (like tail -f)
        logger.info(`Following logs: ${path.basename(logFile)}`);
        logger.info('Press Ctrl+C to stop');
        logger.blank();

        try {
          const tailProcess = execa('tail', ['-f', '-n', numLines.toString(), logFile], {
            stdio: 'inherit',
          });

          await tailProcess;
        } catch (error: any) {
          if (error.signal !== 'SIGINT') {
            throw error;
          }
        }
      } else {
        // Read last N lines
        let content = await fs.readFile(logFile, 'utf-8');
        let lines = content.split('\n').filter(line => line.trim());

        // Filter by log level if specified
        if (options.level) {
          const levelUpper = options.level.toUpperCase();
          lines = lines.filter(line => line.includes(`[${levelUpper}]`));
        }

        // Filter by grep pattern if specified
        if (options.grep) {
          const pattern = new RegExp(options.grep, 'i');
          lines = lines.filter(line => pattern.test(line));
        }

        // Get last N lines
        const displayLines = lines.slice(-numLines);

        if (displayLines.length === 0) {
          logger.info('No matching log entries found');
          return;
        }

        logger.info(`Showing last ${displayLines.length} lines from: ${path.basename(logFile)}`);
        logger.blank();

        // Format and colorize log lines
        displayLines.forEach(line => {
          console.log(formatLogLine(line));
        });
      }
    } catch (error) {
      logger.error('Failed to read logs', error as Error);
      process.exit(1);
    }
  });

/**
 * Format and colorize log line
 */
function formatLogLine(line: string): string {
  // Parse log line: [timestamp] [level] message
  const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/);

  if (!match) {
    return line;
  }

  const [, timestamp, level, message] = match;

  let coloredLevel: string;
  switch (level.toUpperCase()) {
    case 'DEBUG':
      coloredLevel = chalk.gray(level);
      break;
    case 'INFO':
      coloredLevel = chalk.blue(level);
      break;
    case 'WARN':
      coloredLevel = chalk.yellow(level);
      break;
    case 'ERROR':
      coloredLevel = chalk.red(level);
      break;
    case 'SUCCESS':
      coloredLevel = chalk.green(level);
      break;
    default:
      coloredLevel = level;
  }

  return `${chalk.gray(timestamp)} ${coloredLevel} ${message}`;
}
