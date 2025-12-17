#!/usr/bin/env node

import { Command } from 'commander';
import { showBanner } from './utils/banner.js';
import { logger } from './utils/logger.js';
import { updater } from './services/Updater.js';

// Import commands
import { initCommand } from './commands/init.js';
import { loginCommand, logoutCommand } from './commands/auth.js';
import { startCommand, stopCommand, restartCommand, statusCommand } from './commands/agent.js';
import { logsCommand } from './commands/logs.js';
import { updateCommand } from './commands/update.js';
import { configCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';

// Package info
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// Create CLI program
const program = new Command();

program
  .name('remotedevai')
  .description('CLI for managing RemoteDevAI desktop agent')
  .version(packageJson.version, '-v, --version', 'Output the current version')
  .option('--no-banner', 'Hide banner')
  .hook('preAction', async (thisCommand) => {
    // Show banner for all commands except --version and --help
    const opts = thisCommand.opts();
    if (opts.banner !== false && !process.argv.includes('-v') && !process.argv.includes('--version')) {
      showBanner();
    }

    // Check for updates (silent)
    if (opts.banner !== false) {
      try {
        await updater.autoUpdateCheck();
      } catch {
        // Silently fail
      }
    }
  });

// Add commands
program.addCommand(initCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(restartCommand);
program.addCommand(statusCommand);
program.addCommand(logsCommand);
program.addCommand(updateCommand);
program.addCommand(configCommand);
program.addCommand(doctorCommand);

// Enhanced help examples
program.addHelpText('after', `
Examples:
  $ remotedevai login                    # Authenticate with RemoteDevAI
  $ remotedevai init                     # Initialize a project
  $ remotedevai start                    # Start the desktop agent
  $ remotedevai status                   # Check agent status
  $ remotedevai logs -f                  # Follow agent logs
  $ remotedevai update                   # Update to latest version
  $ remotedevai doctor                   # Diagnose issues

Documentation:
  https://docs.remotedevai.com

Get help:
  $ remotedevai <command> --help         # Help for specific command
`);

// Handle unknown commands
program.on('command:*', () => {
  logger.error(`Unknown command: ${program.args.join(' ')}`);
  logger.info('Run "remotedevai --help" for available commands');
  process.exit(1);
});

// Parse arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
