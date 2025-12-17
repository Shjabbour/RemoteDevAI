import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { updater } from '../services/Updater.js';
import { downloader } from '../services/Downloader.js';
import { promptConfirm } from '../utils/prompts.js';

export const updateCommand = new Command('update')
  .description('Update desktop agent to latest version')
  .option('--check', 'Check for updates without installing')
  .option('--force', 'Force update even if already on latest version')
  .action(async (options) => {
    try {
      if (options.check) {
        // Check for updates only
        const updateInfo = await updater.checkForUpdates();

        logger.header('Update Status');
        logger.table([
          ['Current Version', updateInfo.currentVersion],
          ['Latest Version', updateInfo.latestVersion],
          ['Update Available', updateInfo.updateAvailable ? 'Yes' : 'No'],
        ]);

        if (updateInfo.releaseNotes) {
          logger.subheader('Release Notes:');
          logger.log(updateInfo.releaseNotes);
        }

        if (updateInfo.updateAvailable) {
          logger.blank();
          logger.info('Run "remotedevai update" to install the update');
        }
      } else {
        // Check if agent is installed
        const isInstalled = await downloader.isAgentInstalled();

        if (!isInstalled) {
          logger.info('Desktop agent not installed. Installing now...');

          const shouldInstall = await promptConfirm('Install desktop agent?', true);
          if (!shouldInstall) {
            logger.info('Installation cancelled');
            return;
          }

          await downloader.downloadAgent();
          return;
        }

        // Update agent
        await updater.update({ force: options.force });
      }
    } catch (error) {
      logger.error('Update failed', error as Error);
      process.exit(1);
    }
  });
