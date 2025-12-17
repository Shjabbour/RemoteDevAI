import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { configManager } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { downloader } from '../services/Downloader.js';
import { promptText, promptSelect, promptConfirm, validateNotEmpty } from '../utils/prompts.js';

export const initCommand = new Command('init')
  .description('Initialize RemoteDevAI project connection')
  .option('-p, --project-id <id>', 'Project ID to connect to')
  .option('--skip-download', 'Skip agent download')
  .action(async (options) => {
    try {
      logger.header('Initialize RemoteDevAI');

      // Check if already initialized
      const existingProjectId = await configManager.get('projectId');
      if (existingProjectId && !options.projectId) {
        const reinit = await promptConfirm(
          `Already initialized with project ${existingProjectId}. Reinitialize?`,
          false
        );
        if (!reinit) {
          logger.info('Initialization cancelled');
          return;
        }
      }

      // Check authentication
      const isAuthenticated = await configManager.isAuthenticated();
      if (!isAuthenticated) {
        logger.warn('Not authenticated. Please login first.');
        logger.info('Run: remotedevai login');
        return;
      }

      let projectId = options.projectId;

      // If project ID not provided, let user choose
      if (!projectId) {
        spinner.start('Fetching your projects...');

        const projectsResponse = await apiClient.listProjects();
        spinner.stop();

        if (!projectsResponse.success || !projectsResponse.data) {
          logger.error('Failed to fetch projects');
          return;
        }

        const projects = projectsResponse.data;

        if (projects.length === 0) {
          logger.warn('No projects found. Creating a new project...');

          const projectName = await promptText({
            message: 'Enter project name:',
            validate: validateNotEmpty,
          });

          const projectDescription = await promptText({
            message: 'Enter project description (optional):',
          });

          spinner.start('Creating project...');
          const createResponse = await apiClient.createProject({
            name: projectName,
            description: projectDescription || undefined,
          });
          spinner.stop();

          if (!createResponse.success || !createResponse.data) {
            logger.error('Failed to create project');
            return;
          }

          projectId = createResponse.data.id;
          logger.success(`Created project: ${projectName}`);
        } else {
          // Let user select a project
          const choices = [
            ...projects.map((p: any) => `${p.name} (${p.id})`),
            'Create new project',
          ];

          const selection = await promptSelect('Select a project:', choices);

          if (selection === 'Create new project') {
            const projectName = await promptText({
              message: 'Enter project name:',
              validate: validateNotEmpty,
            });

            const projectDescription = await promptText({
              message: 'Enter project description (optional):',
            });

            spinner.start('Creating project...');
            const createResponse = await apiClient.createProject({
              name: projectName,
              description: projectDescription || undefined,
            });
            spinner.stop();

            if (!createResponse.success || !createResponse.data) {
              logger.error('Failed to create project');
              return;
            }

            projectId = createResponse.data.id;
            logger.success(`Created project: ${projectName}`);
          } else {
            // Extract project ID from selection
            const match = selection.match(/\(([^)]+)\)$/);
            if (match) {
              projectId = match[1];
            }
          }
        }
      }

      // Save project ID
      await configManager.set('projectId', projectId);
      logger.success(`Connected to project: ${projectId}`);

      // Download agent if needed
      if (!options.skipDownload) {
        const isInstalled = await downloader.isAgentInstalled();

        if (!isInstalled) {
          logger.blank();
          logger.subheader('Installing Desktop Agent');

          const shouldInstall = await promptConfirm(
            'Desktop agent not found. Download and install now?',
            true
          );

          if (shouldInstall) {
            await downloader.downloadAgent();
          } else {
            logger.info('You can install the agent later with: remotedevai update');
          }
        } else {
          const version = await downloader.getInstalledVersion();
          logger.info(`Desktop agent already installed (version ${version})`);
        }
      }

      logger.blank();
      logger.success('Initialization complete!');
      logger.blank();
      logger.info('Next steps:');
      logger.listItem('Start the agent: remotedevai start');
      logger.listItem('Check agent status: remotedevai status');
      logger.listItem('View agent logs: remotedevai logs');
      logger.blank();
    } catch (error) {
      logger.error('Initialization failed', error as Error);
      process.exit(1);
    }
  });
