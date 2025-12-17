import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/config.js';
import { promptText, promptSelect } from '../utils/prompts.js';
import chalk from 'chalk';

export const configCommand = new Command('config')
  .description('Configure RemoteDevAI settings')
  .option('-l, --list', 'List all configuration values')
  .option('-g, --get <key>', 'Get a specific configuration value')
  .option('-s, --set <key> <value>', 'Set a configuration value')
  .option('--reset', 'Reset all configuration')
  .action(async (options, command) => {
    try {
      if (options.list) {
        // List all config
        const config = await configManager.read();

        logger.header('RemoteDevAI Configuration');

        if (Object.keys(config).length === 0) {
          logger.info('No configuration found');
          return;
        }

        const rows: Array<[string, string]> = [];

        // Hide sensitive values
        Object.entries(config).forEach(([key, value]) => {
          let displayValue: string;

          if (key === 'apiKey') {
            displayValue = value ? maskApiKey(value as string) : 'Not set';
          } else if (value === undefined || value === null) {
            displayValue = 'Not set';
          } else {
            displayValue = value.toString();
          }

          rows.push([key, displayValue]);
        });

        logger.table(rows);
      } else if (options.get) {
        // Get specific config value
        const value = await configManager.get(options.get as any);

        if (value === undefined) {
          logger.info(`${options.get}: Not set`);
        } else {
          let displayValue: string;

          if (options.get === 'apiKey') {
            displayValue = maskApiKey(value as string);
          } else {
            displayValue = value.toString();
          }

          logger.info(`${options.get}: ${displayValue}`);
        }
      } else if (command.args.length === 2 && options.set) {
        // Set config value (using --set flag)
        const [key, value] = command.args;
        await configManager.set(key as any, value as any);
        logger.success(`Set ${key} = ${value}`);
      } else if (options.reset) {
        // Reset all config
        const confirm = await promptText({
          message: 'Are you sure you want to reset all configuration? (yes/no):',
        });

        if (confirm.toLowerCase() === 'yes') {
          await configManager.delete();
          logger.success('Configuration reset');
        } else {
          logger.info('Reset cancelled');
        }
      } else {
        // Interactive configuration
        await interactiveConfig();
      }
    } catch (error) {
      logger.error('Configuration failed', error as Error);
      process.exit(1);
    }
  });

/**
 * Interactive configuration wizard
 */
async function interactiveConfig(): Promise<void> {
  logger.header('Configure RemoteDevAI');

  const config = await configManager.read();

  const settingToEdit = await promptSelect('What would you like to configure?', [
    'API URL',
    'Log Level',
    'Auto Update',
    'View All Settings',
    'Reset Configuration',
    'Exit',
  ]);

  switch (settingToEdit) {
    case 'API URL': {
      const currentUrl = config.apiUrl || configManager.getDefaultApiUrl();
      logger.info(`Current: ${currentUrl}`);

      const newUrl = await promptText({
        message: 'Enter API URL:',
        default: currentUrl,
      });

      await configManager.set('apiUrl', newUrl);
      logger.success(`API URL updated to: ${newUrl}`);
      break;
    }

    case 'Log Level': {
      const currentLevel = config.logLevel || 'info';
      logger.info(`Current: ${currentLevel}`);

      const newLevel = await promptSelect('Select log level:', [
        'debug',
        'info',
        'warn',
        'error',
      ]);

      await configManager.set('logLevel', newLevel as any);
      logger.success(`Log level updated to: ${newLevel}`);
      break;
    }

    case 'Auto Update': {
      const current = config.autoUpdate !== false; // Default to true
      logger.info(`Current: ${current ? 'Enabled' : 'Disabled'}`);

      const enable = await promptSelect('Auto update:', ['Enabled', 'Disabled']);

      await configManager.set('autoUpdate', enable === 'Enabled');
      logger.success(`Auto update ${enable.toLowerCase()}`);
      break;
    }

    case 'View All Settings': {
      const allConfig = await configManager.read();
      const rows: Array<[string, string]> = [];

      Object.entries(allConfig).forEach(([key, value]) => {
        let displayValue: string;

        if (key === 'apiKey') {
          displayValue = value ? maskApiKey(value as string) : 'Not set';
        } else if (value === undefined || value === null) {
          displayValue = 'Not set';
        } else {
          displayValue = value.toString();
        }

        rows.push([key, displayValue]);
      });

      logger.blank();
      logger.table(rows);
      break;
    }

    case 'Reset Configuration': {
      const confirm = await promptText({
        message: 'Are you sure you want to reset all configuration? (yes/no):',
      });

      if (confirm.toLowerCase() === 'yes') {
        await configManager.delete();
        logger.success('Configuration reset');
      } else {
        logger.info('Reset cancelled');
      }
      break;
    }

    case 'Exit':
      logger.info('Goodbye!');
      break;
  }
}

/**
 * Mask API key for display
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return '********';
  }
  const visible = key.slice(0, 4) + '...' + key.slice(-4);
  return visible;
}
