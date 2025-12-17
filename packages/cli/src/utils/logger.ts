import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { format } from 'date-fns';
import { configManager } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export class Logger {
  private logFile?: string;

  constructor() {
    this.initLogFile();
  }

  private async initLogFile(): Promise<void> {
    const logsDir = configManager.getLogsDir();
    await fs.ensureDir(logsDir);
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    this.logFile = path.join(logsDir, `cli-${timestamp}.log`);
  }

  /**
   * Write to log file
   */
  private async writeToFile(level: string, message: string): Promise<void> {
    if (!this.logFile) {
      await this.initLogFile();
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    try {
      await fs.appendFile(this.logFile!, logEntry);
    } catch (error) {
      // Silently fail if we can't write to log file
    }
  }

  /**
   * Debug message (gray)
   */
  debug(message: string): void {
    console.log(chalk.gray(`  ${message}`));
    this.writeToFile('debug', message);
  }

  /**
   * Info message (blue)
   */
  info(message: string): void {
    console.log(chalk.blue(`  ℹ ${message}`));
    this.writeToFile('info', message);
  }

  /**
   * Success message (green)
   */
  success(message: string): void {
    console.log(chalk.green(`  ✓ ${message}`));
    this.writeToFile('success', message);
  }

  /**
   * Warning message (yellow)
   */
  warn(message: string): void {
    console.log(chalk.yellow(`  ⚠ ${message}`));
    this.writeToFile('warn', message);
  }

  /**
   * Error message (red)
   */
  error(message: string, error?: Error): void {
    console.log(chalk.red(`  ✗ ${message}`));
    if (error) {
      console.log(chalk.red(`    ${error.message}`));
      this.writeToFile('error', `${message}: ${error.message}\n${error.stack}`);
    } else {
      this.writeToFile('error', message);
    }
  }

  /**
   * Plain message (no color)
   */
  log(message: string): void {
    console.log(`  ${message}`);
    this.writeToFile('info', message);
  }

  /**
   * Blank line
   */
  blank(): void {
    console.log('');
  }

  /**
   * Header message (bold cyan)
   */
  header(message: string): void {
    console.log(chalk.bold.cyan(`\n  ${message}\n`));
    this.writeToFile('info', `=== ${message} ===`);
  }

  /**
   * Subheader message (bold)
   */
  subheader(message: string): void {
    console.log(chalk.bold(`\n  ${message}`));
    this.writeToFile('info', `--- ${message} ---`);
  }

  /**
   * Code block (gray background)
   */
  code(message: string): void {
    console.log(chalk.bgGray.white(`  ${message}  `));
  }

  /**
   * Table-like output
   */
  table(rows: Array<[string, string]>): void {
    const maxKeyLength = Math.max(...rows.map(([key]) => key.length));
    rows.forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(`  ${chalk.gray(paddedKey)} : ${chalk.white(value)}`);
    });
    this.blank();
  }

  /**
   * List item
   */
  listItem(message: string): void {
    console.log(`  ${chalk.gray('•')} ${message}`);
  }

  /**
   * Step indicator
   */
  step(current: number, total: number, message: string): void {
    console.log(chalk.cyan(`  [${current}/${total}]`) + ` ${message}`);
  }
}

export const logger = new Logger();
