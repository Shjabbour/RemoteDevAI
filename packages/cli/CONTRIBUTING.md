# Contributing to RemoteDevAI CLI

Thank you for your interest in contributing to RemoteDevAI CLI! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- A RemoteDevAI account for testing

### Finding Issues to Work On

- Check the [GitHub Issues](https://github.com/Shjabbour/RemoteDevAI/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Feel free to create new issues for bugs or feature requests

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/RemoteDevAI.git
cd RemoteDevAI/packages/cli
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Link Locally

```bash
npm link
```

Now you can use `remotedevai` command to test your changes.

### 5. Set Up Testing Environment

Create a test account at https://remotedevai.com and note your API key.

## Project Structure

```
packages/cli/
├── src/
│   ├── commands/           # CLI command implementations
│   │   ├── init.ts        # Project initialization
│   │   ├── auth.ts        # Login/logout
│   │   ├── agent.ts       # Agent management
│   │   ├── logs.ts        # Log viewing
│   │   ├── update.ts      # Update management
│   │   ├── config.ts      # Configuration
│   │   └── doctor.ts      # Diagnostics
│   ├── services/          # Business logic
│   │   ├── AgentManager.ts   # Agent process management
│   │   ├── Downloader.ts     # Binary downloads
│   │   └── Updater.ts        # Update checking
│   ├── utils/             # Utility functions
│   │   ├── banner.ts      # ASCII art
│   │   ├── config.ts      # Config management
│   │   ├── logger.ts      # Logging utilities
│   │   ├── spinner.ts     # Loading spinners
│   │   ├── prompts.ts     # User input
│   │   └── api.ts         # API client
│   └── index.ts           # CLI entry point
├── examples/              # Example scripts
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

Follow the coding standards below and make your changes.

### 3. Test Locally

```bash
# Build the project
npm run build

# Test the CLI
remotedevai --help
remotedevai <your-command>
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve bug in agent manager"
```

Use conventional commit messages:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Add type annotations for function parameters and return types
- Avoid `any` type when possible
- Use interfaces for object shapes

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Use async/await instead of promises with `.then()`
- Use descriptive variable and function names

### Documentation

- Add JSDoc comments for all public functions:

```typescript
/**
 * Download and install agent binary
 *
 * @param version - Optional version to download (default: latest)
 * @returns Promise that resolves when download is complete
 */
async downloadAgent(version?: string): Promise<void> {
  // Implementation
}
```

### Error Handling

- Always use try/catch for async operations
- Provide helpful error messages
- Log errors appropriately

```typescript
try {
  await agentManager.start();
  logger.success('Agent started');
} catch (error) {
  logger.error('Failed to start agent', error as Error);
  process.exit(1);
}
```

### User Experience

- Use spinners for long-running operations
- Provide progress indicators for downloads
- Show clear success/error messages
- Add helpful suggestions in error messages

## Testing

### Manual Testing

Before submitting a PR, test the following scenarios:

1. **Installation**
   ```bash
   npm link
   remotedevai --version
   ```

2. **Authentication**
   ```bash
   remotedevai login
   remotedevai logout
   ```

3. **Project Setup**
   ```bash
   remotedevai init
   ```

4. **Agent Management**
   ```bash
   remotedevai start
   remotedevai status
   remotedevai logs
   remotedevai stop
   ```

5. **Updates**
   ```bash
   remotedevai update --check
   ```

6. **Configuration**
   ```bash
   remotedevai config --list
   remotedevai config --set logLevel debug
   ```

7. **Diagnostics**
   ```bash
   remotedevai doctor
   ```

### Automated Testing

(Coming soon: Jest test suite)

## Submitting Changes

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows the coding standards
- [ ] All commands are manually tested
- [ ] Documentation is updated (if needed)
- [ ] CHANGELOG.md is updated
- [ ] Commit messages follow conventional commits
- [ ] No breaking changes (or clearly documented)
- [ ] TypeScript compiles without errors

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tested manually
```

## Release Process

Releases are managed by project maintainers.

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- MAJOR version for breaking changes
- MINOR version for new features
- PATCH version for bug fixes

### Release Steps (Maintainers Only)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes: `git commit -m "chore: release v1.x.x"`
4. Tag release: `git tag -a v1.x.x -m "Release v1.x.x"`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`

## Getting Help

- **Questions?** Open a [Discussion](https://github.com/Shjabbour/RemoteDevAI/discussions)
- **Found a bug?** Open an [Issue](https://github.com/Shjabbour/RemoteDevAI/issues)
- **Need support?** Join our [Discord](https://discord.gg/remotedevai)

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- GitHub Contributors page
- Project README

Thank you for contributing to RemoteDevAI! 🎉
