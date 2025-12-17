/**
 * FileSystemAgent - Handles file and git operations
 *
 * Features:
 * - File operations (read, write, delete, move, copy)
 * - Git operations (status, diff, commit, push)
 * - File watching for changes
 * - Automatic backups before changes
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { watch, FSWatcher } from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  FileOperation,
  FileOperationType,
  GitOperation,
  GitOperationType,
} from '../types';

interface FileOperationResult {
  success: boolean;
  path: string;
  operation: FileOperationType;
  backupPath?: string;
  content?: string;
  error?: string;
}

interface GitOperationResult {
  success: boolean;
  operation: GitOperationType;
  output: any;
  error?: string;
}

/**
 * File System Agent
 */
export class FileSystemAgent extends BaseAgent {
  private git: SimpleGit | null = null;
  private watchers: Map<string, FSWatcher> = new Map();
  private backupDir: string = '';

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'File System Agent',
      type: AgentType.FILE_SYSTEM,
      enabled: true,
      retryAttempts: 2,
      timeout: 30000,
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize git client and backup directory
   */
  protected async onInitialize(): Promise<void> {
    this.git = simpleGit();
    this.backupDir = path.join(process.env.TEMP || '/tmp', 'remotedevai-backups');

    // Create backup directory
    await fs.mkdir(this.backupDir, { recursive: true });

    this.logger.info('File System Agent initialized', {
      backupDir: this.backupDir,
    });
  }

  /**
   * Process file or git operation
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<FileOperationResult | GitOperationResult>> {
    if (message.type === MessageType.FILE_OPERATION) {
      return this.handleFileOperation(message.payload as FileOperation, context);
    } else {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Unsupported message type: ${message.type}`
      );
    }
  }

  /**
   * Handle file operation
   */
  private async handleFileOperation(
    operation: FileOperation,
    context: AgentContext
  ): Promise<AgentResponse<FileOperationResult>> {
    try {
      this.logger.info('Executing file operation', {
        type: operation.type,
        path: operation.path,
      });

      // Validate path is within workspace
      const fullPath = path.resolve(context.environment.workspaceRoot, operation.path);
      if (!fullPath.startsWith(context.environment.workspaceRoot)) {
        throw new Error('Path is outside workspace');
      }

      let result: FileOperationResult;

      switch (operation.type) {
        case FileOperationType.READ:
          result = await this.readFile(fullPath, operation);
          break;

        case FileOperationType.WRITE:
          result = await this.writeFile(fullPath, operation);
          break;

        case FileOperationType.DELETE:
          result = await this.deleteFile(fullPath, operation);
          break;

        case FileOperationType.MOVE:
          result = await this.moveFile(fullPath, operation);
          break;

        case FileOperationType.COPY:
          result = await this.copyFile(fullPath, operation);
          break;

        case FileOperationType.CREATE_DIR:
          result = await this.createDirectory(fullPath, operation);
          break;

        case FileOperationType.LIST:
          result = await this.listDirectory(fullPath, operation);
          break;

        default:
          throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      this.logger.info('File operation completed', {
        type: operation.type,
        path: operation.path,
        success: result.success,
      });

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logger.error('File operation failed', { error, operation });
      return this.createErrorResponse(
        'FILE_OPERATION_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Read file contents
   */
  private async readFile(
    filePath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    const encoding = (operation.options?.encoding as BufferEncoding) || 'utf-8';
    const content = await fs.readFile(filePath, encoding);

    return {
      success: true,
      path: filePath,
      operation: FileOperationType.READ,
      content,
    };
  }

  /**
   * Write file with backup
   */
  private async writeFile(
    filePath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    let backupPath: string | undefined;

    // Create backup if file exists
    if (operation.options?.createBackup !== false) {
      try {
        await fs.access(filePath);
        backupPath = await this.createBackup(filePath);
      } catch {
        // File doesn't exist, no backup needed
      }
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    const encoding = (operation.options?.encoding as BufferEncoding) || 'utf-8';
    await fs.writeFile(filePath, operation.content || '', encoding);

    return {
      success: true,
      path: filePath,
      operation: FileOperationType.WRITE,
      backupPath,
    };
  }

  /**
   * Delete file with backup
   */
  private async deleteFile(
    filePath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    let backupPath: string | undefined;

    // Create backup before deletion
    if (operation.options?.createBackup !== false) {
      backupPath = await this.createBackup(filePath);
    }

    await fs.unlink(filePath);

    return {
      success: true,
      path: filePath,
      operation: FileOperationType.DELETE,
      backupPath,
    };
  }

  /**
   * Move file
   */
  private async moveFile(
    filePath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    if (!operation.destinationPath) {
      throw new Error('Destination path is required for move operation');
    }

    const destPath = path.resolve(operation.destinationPath);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    await fs.rename(filePath, destPath);

    return {
      success: true,
      path: destPath,
      operation: FileOperationType.MOVE,
    };
  }

  /**
   * Copy file
   */
  private async copyFile(
    filePath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    if (!operation.destinationPath) {
      throw new Error('Destination path is required for copy operation');
    }

    const destPath = path.resolve(operation.destinationPath);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    await fs.copyFile(filePath, destPath);

    return {
      success: true,
      path: destPath,
      operation: FileOperationType.COPY,
    };
  }

  /**
   * Create directory
   */
  private async createDirectory(
    dirPath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    await fs.mkdir(dirPath, {
      recursive: operation.options?.recursive !== false,
    });

    return {
      success: true,
      path: dirPath,
      operation: FileOperationType.CREATE_DIR,
    };
  }

  /**
   * List directory contents
   */
  private async listDirectory(
    dirPath: string,
    operation: FileOperation
  ): Promise<FileOperationResult> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries.map((entry) => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));

    return {
      success: true,
      path: dirPath,
      operation: FileOperationType.LIST,
      content: JSON.stringify(files, null, 2),
    };
  }

  /**
   * Create backup of a file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basename = path.basename(filePath);
    const backupPath = path.join(this.backupDir, `${basename}.${timestamp}.bak`);

    await fs.copyFile(filePath, backupPath);
    this.logger.debug('Created backup', { filePath, backupPath });

    return backupPath;
  }

  /**
   * Git operations
   */
  public async executeGitOperation(
    operation: GitOperation,
    workspaceRoot: string
  ): Promise<GitOperationResult> {
    if (!this.git) {
      throw new Error('Git not initialized');
    }

    try {
      this.git.cwd(workspaceRoot);

      let output: any;

      switch (operation.type) {
        case GitOperationType.STATUS:
          output = await this.git.status();
          break;

        case GitOperationType.DIFF:
          output = await this.git.diff(operation.options?.files);
          break;

        case GitOperationType.ADD:
          output = await this.git.add(operation.options?.files || '.');
          break;

        case GitOperationType.COMMIT:
          output = await this.git.commit(operation.options?.message || 'Auto commit');
          break;

        case GitOperationType.PUSH:
          output = await this.git.push(
            operation.options?.remote || 'origin',
            operation.options?.branch || 'main'
          );
          break;

        case GitOperationType.PULL:
          output = await this.git.pull(
            operation.options?.remote || 'origin',
            operation.options?.branch || 'main'
          );
          break;

        case GitOperationType.BRANCH:
          output = await this.git.branch(operation.options);
          break;

        case GitOperationType.CHECKOUT:
          output = await this.git.checkout(operation.options?.branch);
          break;

        case GitOperationType.LOG:
          output = await this.git.log(operation.options);
          break;

        default:
          throw new Error(`Unsupported git operation: ${operation.type}`);
      }

      return {
        success: true,
        operation: operation.type,
        output,
      };
    } catch (error) {
      this.logger.error('Git operation failed', { error, operation });
      return {
        success: false,
        operation: operation.type,
        output: null,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Watch a file or directory for changes
   */
  public watchPath(
    filePath: string,
    callback: (event: string, filename: string) => void
  ): void {
    if (this.watchers.has(filePath)) {
      this.logger.warn('Already watching path', { filePath });
      return;
    }

    const watcher = watch(filePath, { recursive: true }, (event, filename) => {
      this.logger.debug('File change detected', { event, filename, path: filePath });
      callback(event, filename || '');
    });

    this.watchers.set(filePath, watcher);
    this.logger.info('Started watching path', { filePath });
  }

  /**
   * Stop watching a path
   */
  public unwatchPath(filePath: string): void {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      this.logger.info('Stopped watching path', { filePath });
    }
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    // Close all watchers
    for (const [path, watcher] of this.watchers.entries()) {
      watcher.close();
      this.logger.debug('Closed watcher', { path });
    }
    this.watchers.clear();

    this.git = null;
  }
}
