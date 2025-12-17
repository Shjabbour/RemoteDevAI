import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import tar from 'tar';
import { apiClient } from '../utils/api.js';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { configManager } from '../utils/config.js';

export class Downloader {
  /**
   * Download and install agent binary
   */
  async downloadAgent(version?: string): Promise<void> {
    spinner.start('Checking for latest agent version...');

    try {
      // Get download information
      const response = await apiClient.checkAgentUpdate(version || '0.0.0');

      if (!response.success || !response.data) {
        spinner.fail('Failed to get agent download information');
        throw new Error('Unable to fetch agent version information');
      }

      const { latestVersion, downloadUrl } = response.data;

      spinner.update(`Downloading RemoteDevAI Agent v${latestVersion}...`);

      // Download agent binary
      let downloadProgress = 0;
      const buffer = await apiClient.downloadFile(downloadUrl, (progress) => {
        if (progress !== downloadProgress) {
          downloadProgress = progress;
          spinner.update(`Downloading RemoteDevAI Agent v${latestVersion}... ${progress}%`);
        }
      });

      spinner.update('Extracting agent files...');

      // Get agent installation directory
      const agentDir = configManager.getAgentDir();
      await fs.ensureDir(agentDir);

      // Save archive temporarily
      const tempArchive = path.join(os.tmpdir(), 'remotedevai-agent.tar.gz');
      await fs.writeFile(tempArchive, buffer);

      // Extract archive
      await tar.extract({
        file: tempArchive,
        cwd: agentDir,
        strip: 1, // Remove top-level directory from archive
      });

      // Clean up temp file
      await fs.remove(tempArchive);

      // Make executable (Unix only)
      if (os.platform() !== 'win32') {
        const execPath = path.join(agentDir, 'bin', 'remotedevai-agent');
        await fs.chmod(execPath, 0o755);
      }

      // Save version info
      await this.saveVersion(latestVersion);

      spinner.succeed(`Successfully installed RemoteDevAI Agent v${latestVersion}`);
    } catch (error) {
      spinner.fail('Failed to download agent');
      throw error;
    }
  }

  /**
   * Check if agent is installed
   */
  async isAgentInstalled(): Promise<boolean> {
    const agentDir = configManager.getAgentDir();
    const platform = os.platform();
    const execName = platform === 'win32' ? 'remotedevai-agent.exe' : 'remotedevai-agent';
    const execPath = path.join(agentDir, 'bin', execName);

    return fs.pathExists(execPath);
  }

  /**
   * Get installed agent version
   */
  async getInstalledVersion(): Promise<string | null> {
    const agentDir = configManager.getAgentDir();
    const versionFile = path.join(agentDir, 'version.txt');

    try {
      if (await fs.pathExists(versionFile)) {
        const version = await fs.readFile(versionFile, 'utf-8');
        return version.trim();
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Save version information
   */
  private async saveVersion(version: string): Promise<void> {
    const agentDir = configManager.getAgentDir();
    const versionFile = path.join(agentDir, 'version.txt');
    await fs.writeFile(versionFile, version, 'utf-8');
  }

  /**
   * Clean up old agent installations
   */
  async cleanup(): Promise<void> {
    const agentDir = configManager.getAgentDir();
    if (await fs.pathExists(agentDir)) {
      await fs.remove(agentDir);
      logger.success('Cleaned up agent installation');
    }
  }

  /**
   * Get agent installation path
   */
  getAgentPath(): string {
    return configManager.getAgentDir();
  }

  /**
   * Get platform-specific download information
   */
  private getPlatformInfo(): { platform: string; arch: string } {
    const platform = os.platform();
    const arch = os.arch();

    let platformName: string;
    switch (platform) {
      case 'darwin':
        platformName = 'macos';
        break;
      case 'win32':
        platformName = 'windows';
        break;
      case 'linux':
        platformName = 'linux';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    let archName: string;
    switch (arch) {
      case 'x64':
        archName = 'amd64';
        break;
      case 'arm64':
        archName = 'arm64';
        break;
      default:
        throw new Error(`Unsupported architecture: ${arch}`);
    }

    return { platform: platformName, arch: archName };
  }
}

export const downloader = new Downloader();
