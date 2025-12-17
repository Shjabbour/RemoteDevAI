import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { configManager } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { promptText, promptPassword, validateEmail, validateNotEmpty } from '../utils/prompts.js';

export const loginCommand = new Command('login')
  .description('Authenticate with RemoteDevAI cloud')
  .option('-e, --email <email>', 'Email address')
  .option('-k, --api-key <key>', 'API key (skip password prompt)')
  .action(async (options) => {
    try {
      logger.header('Login to RemoteDevAI');

      // Check if already authenticated
      const isAuthenticated = await configManager.isAuthenticated();
      if (isAuthenticated) {
        const email = await configManager.get('email');
        logger.info(`Already logged in as: ${email}`);
        logger.info('Use "remotedevai logout" to logout first');
        return;
      }

      let apiKey = options.apiKey;

      if (apiKey) {
        // Verify API key
        spinner.start('Verifying API key...');

        const verifyResponse = await apiClient.verifyApiKey(apiKey);
        spinner.stop();

        if (!verifyResponse.success || !verifyResponse.data?.valid) {
          logger.error('Invalid API key');
          return;
        }

        // Save credentials
        await configManager.update({
          apiKey,
          email: verifyResponse.data.user.email,
          userId: verifyResponse.data.user.id,
        });

        logger.success(`Logged in as: ${verifyResponse.data.user.email}`);
      } else {
        // Email/password login
        const email = options.email || await promptText({
          message: 'Email:',
          validate: validateEmail,
        });

        const password = await promptPassword({
          message: 'Password:',
          validate: validateNotEmpty,
        });

        spinner.start('Authenticating...');

        const loginResponse = await apiClient.login(email, password);
        spinner.stop();

        if (!loginResponse.success || !loginResponse.data) {
          logger.error('Authentication failed');
          return;
        }

        // Save credentials
        await configManager.update({
          apiKey: loginResponse.data.apiKey,
          email,
          userId: loginResponse.data.userId,
        });

        logger.success(`Logged in as: ${email}`);
      }

      logger.blank();
      logger.info('Next steps:');
      logger.listItem('Initialize a project: remotedevai init');
      logger.listItem('Check status: remotedevai status');
      logger.blank();
    } catch (error) {
      logger.error('Login failed', error as Error);
      process.exit(1);
    }
  });

export const logoutCommand = new Command('logout')
  .description('Clear authentication credentials')
  .action(async () => {
    try {
      const isAuthenticated = await configManager.isAuthenticated();

      if (!isAuthenticated) {
        logger.info('Not logged in');
        return;
      }

      const email = await configManager.get('email');

      // Clear credentials
      await configManager.update({
        apiKey: undefined,
        email: undefined,
        userId: undefined,
      });

      logger.success(`Logged out from: ${email}`);
    } catch (error) {
      logger.error('Logout failed', error as Error);
      process.exit(1);
    }
  });
