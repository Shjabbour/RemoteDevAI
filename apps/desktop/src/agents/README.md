# Local Agents

This directory contains local agent implementations that extend the shared agents package.

## Overview

Agents are autonomous components that can execute tasks on behalf of remote users. Each agent:
- Listens for commands from the cloud
- Executes tasks using local system resources
- Reports results back to the cloud

## Agent Types

### 1. System Agent
Handles system-level operations:
- File system operations (read, write, delete)
- Process management
- System information gathering

### 2. Code Agent
Handles code-related operations:
- Running build commands
- Executing tests
- Code analysis
- Git operations

### 3. Browser Agent
Handles browser automation:
- Web scraping
- UI testing
- Screenshot capture
- Form filling

### 4. Terminal Agent
Handles terminal operations:
- Command execution
- Script running
- Shell interaction

## Creating a New Agent

```typescript
import { BaseAgent } from './BaseAgent';
import { ConnectionService } from '../services/ConnectionService';

export class MyAgent extends BaseAgent {
  constructor(connectionService: ConnectionService) {
    super('my-agent', connectionService);
  }

  protected async handleCommand(command: any): Promise<any> {
    switch (command.action) {
      case 'my-action':
        return await this.performAction(command.params);
      default:
        throw new Error(`Unknown action: ${command.action}`);
    }
  }

  private async performAction(params: any): Promise<any> {
    // Implement your action here
    return { success: true, result: 'Done!' };
  }
}
```

## Usage

Agents are automatically initialized by the main process and listen for commands from the cloud.

## Security Considerations

- Always validate input parameters
- Use sandboxed execution for untrusted code
- Implement rate limiting
- Log all actions for audit trail
- Never expose sensitive credentials
