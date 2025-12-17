# Developer Guide - RemoteDevAI CLI

This guide is for developers who want to understand, modify, or contribute to the RemoteDevAI CLI codebase.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Code Organization](#code-organization)
- [Key Concepts](#key-concepts)
- [Adding New Commands](#adding-new-commands)
- [Working with Services](#working-with-services)
- [Utilities Reference](#utilities-reference)
- [API Integration](#api-integration)
- [Testing](#testing)
- [Debugging](#debugging)
- [Best Practices](#best-practices)

## Architecture Overview

The CLI follows a layered architecture:

```
┌─────────────────────────────────────┐
│         CLI Entry Point             │
│         (src/index.ts)              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│           Commands Layer            │
│    (src/commands/*.ts)              │
│  - Handles user interaction         │
│  - Parses arguments/options         │
│  - Calls services                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│          Services Layer             │
│    (src/services/*.ts)              │
│  - Business logic                   │
│  - Agent management                 │
│  - Updates/downloads                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│          Utilities Layer            │
│    (src/utils/*.ts)                 │
│  - Config management                │
│  - API client                       │
│  - Logging/UI                       │
└─────────────────────────────────────┘
```

## Code Organization

### Commands (`src/commands/`)

Each command file exports one or more Commander.js commands:

```typescript
import { Command } from 'commander';

export const myCommand = new Command('my-command')
  .description('Description of what it does')
  .option('-f, --flag', 'Flag description')
  .action(async (options) => {
    // Command implementation
  });
```

### Services (`src/services/`)

Services contain reusable business logic:

```typescript
export class MyService {
  async doSomething(): Promise<void> {
    // Service logic
  }
}

export const myService = new MyService();
```

### Utils (`src/utils/`)

Utilities are helper functions and classes:

```typescript
export class MyUtil {
  static doSomething(): void {
    // Utility logic
  }
}

export const myUtil = new MyUtil();
```

## Key Concepts

### Configuration Management

Configuration is stored in `~/.remotedevai/config.json`:

```typescript
import { configManager } from '../utils/config.js';

// Read configuration
const config = await configManager.read();

// Get specific value
const apiKey = await configManager.get('apiKey');

// Set specific value
await configManager.set('apiKey', 'new-key');

// Update multiple values
await configManager.update({
  apiKey: 'new-key',
  projectId: 'proj-123',
});
```

### Logging and UI

Use the logger utility for consistent output:

```typescript
import { logger } from '../utils/logger.js';

logger.success('Operation completed successfully');
logger.error('Operation failed', error);
logger.warn('This is a warning');
logger.info('This is informational');
logger.debug('Debug information');

logger.header('Section Header');
logger.subheader('Subsection');
logger.table([
  ['Key', 'Value'],
  ['Another', 'Row'],
]);
```

### Spinners

Use spinners for long-running operations:

```typescript
import { spinner } from '../utils/spinner.js';

spinner.start('Downloading...');
try {
  await longOperation();
  spinner.succeed('Download complete');
} catch (error) {
  spinner.fail('Download failed');
  throw error;
}
```

### User Input

Use prompts for interactive input:

```typescript
import {
  promptText,
  promptConfirm,
  promptSelect,
  validateEmail
} from '../utils/prompts.js';

const name = await promptText({
  message: 'Enter your name:',
  validate: (value) => value.length > 0 || 'Name is required',
});

const confirmed = await promptConfirm('Are you sure?', true);

const choice = await promptSelect('Select option:', [
  'Option 1',
  'Option 2',
  'Option 3',
]);
```

### API Communication

Use the API client for all API calls:

```typescript
import { apiClient } from '../utils/api.js';

// Login
const response = await apiClient.login(email, password);

// Get projects
const projects = await apiClient.listProjects();

// Create project
const project = await apiClient.createProject({
  name: 'My Project',
  description: 'Description',
});
```

## Adding New Commands

### 1. Create Command File

Create a new file in `src/commands/`:

```typescript
// src/commands/example.ts
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';

export const exampleCommand = new Command('example')
  .description('Example command description')
  .option('-f, --flag', 'Example flag')
  .option('-v, --value <value>', 'Example value option')
  .action(async (options) => {
    try {
      logger.header('Example Command');

      // Validate options
      if (!options.value) {
        logger.error('Value is required');
        logger.info('Usage: remotedevai example --value <value>');
        process.exit(1);
      }

      // Show spinner for long operation
      spinner.start('Processing...');

      // Do something
      await doSomething(options.value);

      spinner.succeed('Processing complete');

      // Show results
      logger.success('Command completed successfully');

    } catch (error) {
      if (spinner.isSpinning()) {
        spinner.fail('Processing failed');
      }
      logger.error('Command failed', error as Error);
      process.exit(1);
    }
  });

async function doSomething(value: string): Promise<void> {
  // Implementation
}
```

### 2. Register Command

Add to `src/index.ts`:

```typescript
import { exampleCommand } from './commands/example.js';

// ...

program.addCommand(exampleCommand);
```

### 3. Test Command

```bash
npm run build
remotedevai example --value test
```

## Working with Services

### Creating a New Service

```typescript
// src/services/ExampleService.ts
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/config.js';

export class ExampleService {
  /**
   * Do something useful
   *
   * @param param - Parameter description
   * @returns Promise resolving to result
   */
  async doSomething(param: string): Promise<string> {
    const config = await configManager.read();

    // Service logic here
    logger.debug(`Processing: ${param}`);

    return `Processed: ${param}`;
  }

  /**
   * Another method
   */
  async anotherMethod(): Promise<void> {
    // Implementation
  }
}

// Export singleton instance
export const exampleService = new ExampleService();
```

### Using a Service

```typescript
import { exampleService } from '../services/ExampleService.js';

const result = await exampleService.doSomething('input');
console.log(result);
```

## Utilities Reference

### ConfigManager

```typescript
// Read all config
const config = await configManager.read();

// Get specific value
const value = await configManager.get('key');

// Set specific value
await configManager.set('key', 'value');

// Update multiple values
await configManager.update({ key1: 'value1', key2: 'value2' });

// Delete config
await configManager.delete();

// Check if authenticated
const isAuth = await configManager.isAuthenticated();

// Get paths
const configDir = configManager.getConfigDir();
const agentDir = configManager.getAgentDir();
const logsDir = configManager.getLogsDir();
```

### Logger

```typescript
// Messages
logger.success('Success message');
logger.error('Error message', error);
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');
logger.log('Plain message');

// Formatting
logger.header('Header');
logger.subheader('Subheader');
logger.blank();

// Tables
logger.table([
  ['Key 1', 'Value 1'],
  ['Key 2', 'Value 2'],
]);

// Lists
logger.listItem('List item');

// Steps
logger.step(1, 3, 'First step');
logger.step(2, 3, 'Second step');
```

### Spinner

```typescript
// Start spinner
spinner.start('Loading...');

// Update text
spinner.update('Still loading...');

// Success
spinner.succeed('Done!');

// Fail
spinner.fail('Failed!');

// Warn
spinner.warn('Warning!');

// Info
spinner.info('Info!');

// Stop
spinner.stop();

// Check if spinning
if (spinner.isSpinning()) {
  spinner.stop();
}
```

### API Client

```typescript
// Authentication
const loginResult = await apiClient.login(email, password);
const verifyResult = await apiClient.verifyApiKey(apiKey);

// User
const profile = await apiClient.getProfile();

// Projects
const projects = await apiClient.listProjects();
const project = await apiClient.getProject(projectId);
const newProject = await apiClient.createProject({ name, description });

// Agents
const agent = await apiClient.registerAgent(data);
const status = await apiClient.getAgentStatus(agentId);
await apiClient.updateAgentHeartbeat(agentId, data);

// Updates
const updateInfo = await apiClient.checkAgentUpdate(currentVersion);
const buffer = await apiClient.downloadFile(url, onProgress);
```

## API Integration

### Error Handling

Always handle API errors gracefully:

```typescript
try {
  const response = await apiClient.someMethod();

  if (!response.success) {
    logger.error(response.error || 'Operation failed');
    return;
  }

  // Use response.data
  const data = response.data;

} catch (error) {
  logger.error('API request failed', error as Error);
  // Provide helpful suggestions
  logger.info('Check your internet connection and try again');
}
```

### Authentication

Check authentication before API calls:

```typescript
const isAuthenticated = await configManager.isAuthenticated();

if (!isAuthenticated) {
  logger.error('Not authenticated. Please login first.');
  logger.info('Run: remotedevai login');
  process.exit(1);
}
```

## Testing

### Manual Testing Checklist

Before committing code, test:

- [ ] Command help: `remotedevai <command> --help`
- [ ] Valid inputs
- [ ] Invalid inputs
- [ ] Error conditions
- [ ] Edge cases
- [ ] Cross-platform compatibility

### Test Script

```bash
#!/bin/bash
# test.sh

# Build
npm run build

# Test commands
remotedevai --version
remotedevai --help
remotedevai status
remotedevai config --list
remotedevai doctor

echo "All tests passed!"
```

## Debugging

### Enable Debug Logs

```bash
remotedevai config --set logLevel debug
```

### View CLI Logs

```bash
remotedevai logs --cli
```

### Debug in VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/index.js",
      "args": ["status"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true
    }
  ]
}
```

### Add Debug Statements

```typescript
logger.debug(`Variable value: ${JSON.stringify(variable)}`);
logger.debug(`Config: ${JSON.stringify(await configManager.read())}`);
```

## Best Practices

### 1. Error Handling

Always use try/catch:

```typescript
try {
  await operation();
  logger.success('Success');
} catch (error) {
  logger.error('Failed', error as Error);
  process.exit(1);
}
```

### 2. User Feedback

Always show what's happening:

```typescript
spinner.start('Downloading...');
// ... long operation
spinner.succeed('Download complete');
```

### 3. Input Validation

Validate before processing:

```typescript
if (!input) {
  logger.error('Input is required');
  logger.info('Usage: remotedevai command --input <value>');
  process.exit(1);
}
```

### 4. Exit Codes

Use appropriate exit codes:

```typescript
process.exit(0);  // Success
process.exit(1);  // Error
```

### 5. Documentation

Add JSDoc comments:

```typescript
/**
 * Download and install agent
 *
 * @param version - Version to install (optional)
 * @returns Promise resolving when complete
 */
async function install(version?: string): Promise<void> {
  // ...
}
```

### 6. TypeScript

Use types properly:

```typescript
interface Options {
  flag?: boolean;
  value?: string;
}

async function handle(options: Options): Promise<void> {
  // ...
}
```

### 7. Async/Await

Always use async/await, not promises:

```typescript
// Good
const result = await operation();

// Bad
operation().then(result => { ... });
```

### 8. Imports

Use ES modules:

```typescript
// Good
import { something } from './module.js';

// Bad
const something = require('./module');
```

Note the `.js` extension in imports - required for ES modules.

## Common Patterns

### Command Template

```typescript
export const myCommand = new Command('my-command')
  .description('Description')
  .option('-o, --option <value>', 'Option description')
  .action(async (options) => {
    try {
      logger.header('My Command');

      // Validate
      // Process
      // Show results

      logger.success('Complete');
    } catch (error) {
      logger.error('Failed', error as Error);
      process.exit(1);
    }
  });
```

### Service Template

```typescript
export class MyService {
  async operation(): Promise<void> {
    // Implementation
  }
}

export const myService = new MyService();
```

### Error Handling Template

```typescript
try {
  spinner.start('Processing...');
  await operation();
  spinner.succeed('Success');
} catch (error) {
  if (spinner.isSpinning()) {
    spinner.fail('Failed');
  }
  logger.error('Error message', error as Error);
  throw error;
}
```

## Resources

- TypeScript Docs: https://www.typescriptlang.org/docs/
- Commander.js: https://github.com/tj/commander.js
- Inquirer.js: https://github.com/SBoudrias/Inquirer.js
- Ora: https://github.com/sindresorhus/ora
- Chalk: https://github.com/chalk/chalk

---

Happy coding! If you have questions, open a discussion on GitHub.
