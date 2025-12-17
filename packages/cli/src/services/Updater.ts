import semver from 'semver';
import { apiClient } from '../utils/api.js';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { downloader } from './Downloader.js';
import { agentManager } from './AgentManager.js';
import { promptConfirm } from '../utils/prompts.js';

export class Updater {
  /**
   * Check for agent updates
   */
  async checkForUpdates(silent = false): Promise<{
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseNotes?: string;
  }> {
    const currentVersion = await downloader.getInstalledVersion();

    if (!currentVersion) {
      return {
        updateAvailable: false,
        currentVersion: 'not installed',
        latestVersion: 'unknown',
      };
    }

    try {
      if (!silent) {
        spinner.start('Checking for updates...');
      }

      const response = await apiClient.checkAgentUpdate(currentVersion);

      if (!silent) {
        spinner.stop();
      }

      if (!response.success || !response.data) {
        if (!silent) {
          logger.warn('Unable to check for updates');
        }
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion: currentVersion,
        };
      }

      const { updateAvailable, latestVersion, releaseNotes } = response.data;

      return {
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseNotes,
      };
    } catch (error) {
      if (!silent) {
        logger.warn('Unable to check for updates');
      }
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
      };
    }
  }

  /**
   * Update agent to latest version
   */
  async update(options: { force?: boolean } = {}): Promise<void> {
    const updateInfo = await this.checkForUpdates();

    if (!options.force && !updateInfo.updateAvailable) {
      logger.info(`Already on latest version (${updateInfo.currentVersion})`);
      return;
    }

    logger.blank();
    logger.header('Agent Update Available');
    logger.table([
      ['Current Version', updateInfo.currentVersion],
      ['Latest Version', updateInfo.latestVersion],
    ]);

    if (updateInfo.releaseNotes) {
      logger.subheader('Release Notes:');
      logger.log(updateInfo.releaseNotes);
      logger.blank();
    }

    const shouldUpdate = await promptConfirm('Do you want to update now?', true);

    if (!shouldUpdate) {
      logger.info('Update cancelled');
      return;
    }

    // Check if agent is running
    const isRunning = await agentManager.isRunning();
    let shouldRestart = false;

    if (isRunning) {
      shouldRestart = await promptConfirm(
        'Agent is currently running. Do you want to stop it for the update?',
        true
      );

      if (!shouldRestart) {
        logger.warn('Cannot update while agent is running. Please stop the agent first.');
        return;
      }

      // Stop agent
      spinner.start('Stopping agent...');
      await agentManager.stop();
      spinner.succeed('Agent stopped');
    }

    try {
      // Download and install new version
      await downloader.downloadAgent(updateInfo.latestVersion);

      // Restart agent if it was running
      if (shouldRestart) {
        spinner.start('Starting agent...');
        await agentManager.start({ detached: true });
        spinner.succeed('Agent started');
      }

      logger.blank();
      logger.success(`Successfully updated to version ${updateInfo.latestVersion}`);
    } catch (error) {
      logger.error('Update failed', error as Error);

      // Try to restart agent if it was running
      if (shouldRestart) {
        try {
          logger.info('Attempting to restart agent with previous version...');
          await agentManager.start({ detached: true });
          logger.success('Agent restarted');
        } catch (restartError) {
          logger.error('Failed to restart agent', restartError as Error);
        }
      }

      throw error;
    }
  }

  /**
   * Auto-update check (silent)
   */
  async autoUpdateCheck(): Promise<void> {
    const updateInfo = await this.checkForUpdates(true);

    if (updateInfo.updateAvailable) {
      logger.blank();
      logger.info(`New version available: ${updateInfo.latestVersion} (current: ${updateInfo.currentVersion})`);
      logger.info(`Run 'remotedevai update' to upgrade`);
      logger.blank();
    }
  }

  /**
   * Compare versions
   */
  compareVersions(v1: string, v2: string): number {
    try {
      if (semver.gt(v1, v2)) return 1;
      if (semver.lt(v1, v2)) return -1;
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check if version is valid
   */
  isValidVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }
}

export const updater = new Updater();
