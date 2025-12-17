# RemoteDevAI CLI - Project Structure

Complete overview of the CLI package structure and files.

## Directory Tree

```
packages/cli/
├── .github/
│   └── workflows/
│       └── ci.yml                      # CI/CD pipeline for testing and publishing
├── examples/
│   ├── basic-usage.sh                  # Basic workflow example
│   ├── setup-new-machine.sh            # New machine setup script
│   └── ci-cd-integration.sh            # CI/CD integration example
├── src/
│   ├── commands/                       # CLI command implementations
│   │   ├── init.ts                     # Project initialization command
│   │   ├── auth.ts                     # Login/logout commands
│   │   ├── agent.ts                    # Agent start/stop/status/restart
│   │   ├── logs.ts                     # Log viewing with filtering
│   │   ├── update.ts                   # Agent update command
│   │   ├── config.ts                   # Configuration management
│   │   └── doctor.ts                   # System diagnostics
│   ├── services/                       # Business logic services
│   │   ├── AgentManager.ts             # Desktop agent process management
│   │   ├── Downloader.ts               # Agent binary download/install
│   │   └── Updater.ts                  # Update checking and installation
│   ├── utils/                          # Utility modules
│   │   ├── banner.ts                   # ASCII art banner
│   │   ├── config.ts                   # Configuration file management
│   │   ├── logger.ts                   # Logging utilities with colors
│   │   ├── spinner.ts                  # Loading spinner wrapper
│   │   ├── prompts.ts                  # Interactive user prompts
│   │   └── api.ts                      # API client for cloud
│   └── index.ts                        # CLI entry point and router
├── dist/                               # Compiled JavaScript output (generated)
├── .eslintrc.json                      # ESLint configuration
├── .gitignore                          # Git ignore patterns
├── .npmignore                          # npm ignore patterns
├── .npmrc                              # npm configuration
├── CHANGELOG.md                        # Version history and changes
├── CONTRIBUTING.md                     # Contribution guidelines
├── LICENSE                             # MIT license
├── package.json                        # Package metadata and dependencies
├── PROJECT_STRUCTURE.md                # This file
├── QUICKSTART.md                       # Quick start guide
├── README.md                           # Main documentation
└── tsconfig.json                       # TypeScript configuration
```

## File Descriptions

### Configuration Files

- **.eslintrc.json** - ESLint rules for code quality and consistency
- **tsconfig.json** - TypeScript compiler settings
- **.npmrc** - npm configuration (exact versions, no package-lock)
- **.gitignore** - Files to exclude from Git
- **.npmignore** - Files to exclude from npm package

### Documentation

- **README.md** - Main documentation with all commands and examples
- **QUICKSTART.md** - 5-minute quick start guide for new users
- **CONTRIBUTING.md** - Guidelines for contributors
- **CHANGELOG.md** - Version history following Keep a Changelog format
- **PROJECT_STRUCTURE.md** - This file, describing project organization
- **LICENSE** - MIT license

### Source Code

#### Commands (`src/commands/`)

Each command file exports a Commander.js command:

- **init.ts** - Interactive project initialization wizard
  - Select/create projects
  - Download agent
  - Configure settings

- **auth.ts** - Authentication commands
  - `login` - Email/password or API key login
  - `logout` - Clear credentials

- **agent.ts** - Agent lifecycle management
  - `start` - Start agent (foreground/background)
  - `stop` - Gracefully stop agent
  - `restart` - Restart with new configuration
  - `status` - Show agent status and system info

- **logs.ts** - Log viewing and filtering
  - View last N lines
  - Follow logs (tail -f)
  - Filter by level
  - Search with grep

- **update.ts** - Agent updates
  - Check for updates
  - Download and install
  - Force update option

- **config.ts** - Configuration management
  - Interactive wizard
  - Get/set individual values
  - List all settings
  - Reset to defaults

- **doctor.ts** - System diagnostics
  - System compatibility check
  - Node.js version
  - Authentication status
  - Agent installation
  - API connectivity
  - Disk space
  - File permissions

#### Services (`src/services/`)

Business logic separated from UI:

- **AgentManager.ts** - Desktop agent process control
  - Start/stop/restart
  - PID file management
  - Process monitoring
  - Uptime tracking
  - Log file location

- **Downloader.ts** - Binary download and installation
  - Download from API
  - Extract archives
  - Platform detection
  - Version management
  - Installation verification

- **Updater.ts** - Update management
  - Check for updates
  - Download new versions
  - Safe updates with rollback
  - Auto-update notifications
  - Version comparison

#### Utils (`src/utils/`)

Reusable utility modules:

- **banner.ts** - ASCII art banner for CLI
  - Beautiful RemoteDevAI logo
  - Version information
  - Welcome messages

- **config.ts** - Configuration file I/O
  - Read/write config.json
  - Default values
  - Path management
  - Authentication checks

- **logger.ts** - Colorful console output
  - Success/error/warn/info messages
  - Code blocks
  - Tables
  - Lists
  - File logging

- **spinner.ts** - Loading spinner wrapper
  - Start/stop/update
  - Success/fail states
  - Consistent UX

- **prompts.ts** - Interactive user input
  - Text input
  - Password input
  - Confirmations
  - Select lists
  - Multi-select
  - Input validation

- **api.ts** - HTTP client for RemoteDevAI API
  - Authentication
  - Project management
  - Agent registration
  - Update checks
  - Error handling

#### Entry Point (`src/index.ts`)

Main CLI router:
- Registers all commands
- Handles global options
- Shows banner
- Auto-update check
- Help text
- Error handling

### Examples (`examples/`)

Shell scripts demonstrating usage:

- **basic-usage.sh** - Simple workflow example
- **setup-new-machine.sh** - Complete setup automation
- **ci-cd-integration.sh** - CI/CD pipeline integration

### CI/CD (`.github/workflows/`)

- **ci.yml** - GitHub Actions workflow
  - Build and test on multiple platforms
  - Lint and type-check
  - Publish to npm on release

## Key Design Decisions

### Architecture

1. **Command Pattern** - Each command is isolated in its own file
2. **Service Layer** - Business logic separated from UI
3. **Utility Layer** - Reusable components
4. **TypeScript** - Type safety and better DX
5. **ES Modules** - Modern JavaScript

### User Experience

1. **Beautiful Output** - Colors, spinners, progress bars
2. **Interactive Prompts** - User-friendly input
3. **Helpful Errors** - Clear messages with suggestions
4. **Comprehensive Help** - Examples for all commands
5. **Progress Feedback** - Always show what's happening

### Developer Experience

1. **TypeScript** - Type safety and IDE support
2. **ESLint** - Code quality and consistency
3. **Documentation** - Extensive inline and external docs
4. **Examples** - Real-world usage patterns
5. **CI/CD** - Automated testing and publishing

## Configuration Storage

User configuration is stored in:
```
~/.remotedevai/
├── config.json          # User settings
├── agent/               # Agent installation
│   ├── bin/            # Executable
│   └── version.txt     # Installed version
└── logs/               # Log files
    ├── cli-*.log       # CLI logs
    └── agent-*.log     # Agent logs
```

## Dependencies Overview

### Production Dependencies

- **commander** - CLI framework
- **inquirer** - Interactive prompts
- **ora** - Terminal spinners
- **chalk** - Terminal colors
- **axios** - HTTP client
- **fs-extra** - Enhanced file system
- **tar** - Archive extraction
- **semver** - Version comparison
- **execa** - Process execution
- **date-fns** - Date formatting
- **boxen** - Terminal boxes
- **cli-table3** - Terminal tables

### Dev Dependencies

- **typescript** - Type checking
- **eslint** - Code linting
- **@typescript-eslint** - TypeScript linting
- **jest** - Testing framework
- **@types/** - Type definitions

## Build Process

1. **Development**: `npm run dev` - Watch mode compilation
2. **Production**: `npm run build` - Full TypeScript compilation
3. **Clean**: `npm run clean` - Remove build artifacts
4. **Lint**: `npm run lint` - Check code quality
5. **Publish**: `npm publish` - Publish to npm registry

## Testing Strategy

1. **Manual Testing** - All commands tested manually
2. **CI Pipeline** - Automated build and type checking
3. **Cross-Platform** - Tested on macOS, Linux, Windows
4. **Node Versions** - Tested on Node 18, 20, 21

## Future Enhancements

- [ ] Automated unit tests with Jest
- [ ] Integration tests
- [ ] Shell completion (bash/zsh/fish)
- [ ] Telemetry and crash reporting
- [ ] Performance profiling
- [ ] Docker support
- [ ] Agent plugin system
- [ ] Multiple project support

## Maintenance

- **Version Management** - Semantic versioning
- **Changelog** - Keep a Changelog format
- **Dependencies** - Regular updates
- **Security** - npm audit checks
- **Documentation** - Keep in sync with code

---

Last Updated: 2024-12-16
CLI Version: 1.0.0
