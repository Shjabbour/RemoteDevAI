# Changelog

All notable changes to @remotedevai/cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-16

### Added

- Initial release of RemoteDevAI CLI
- Authentication commands (`login`, `logout`)
- Project initialization (`init`)
- Agent management (`start`, `stop`, `restart`, `status`)
- Log viewing (`logs`) with filtering and follow mode
- Auto-update functionality (`update`)
- Configuration management (`config`)
- System diagnostics (`doctor`)
- Beautiful ASCII art banner
- Colorful console output with spinners and progress bars
- Interactive prompts for user-friendly setup
- Comprehensive help documentation
- Support for macOS, Linux, and Windows
- Support for x64 and arm64 architectures

### Features

#### Authentication
- Email/password login
- API key authentication
- Credential storage in `~/.remotedevai/config.json`
- Auto-logout on credential clear

#### Project Management
- Interactive project selection
- Project creation from CLI
- Automatic agent installation during init
- Project ID configuration

#### Agent Management
- Start agent in background or foreground mode
- Stop running agent gracefully
- Restart agent with configuration preservation
- Check agent status with uptime and version info
- Automatic PID file management

#### Logging
- View agent logs with customizable line count
- Follow logs in real-time (tail -f mode)
- Filter logs by level (debug, info, warn, error)
- Search logs with grep patterns
- View CLI logs separately
- Automatic log rotation

#### Updates
- Check for agent updates
- Download and install latest agent version
- Force update option
- Automatic update checks on CLI start
- Safe update with rollback on failure

#### Configuration
- Interactive configuration wizard
- View all settings
- Get/set individual settings
- Reset configuration to defaults
- Support for environment variables

#### Diagnostics
- System information check
- Node.js version verification
- Authentication status check
- Configuration validation
- Agent installation verification
- Agent running status check
- API connectivity test
- Disk space check
- File permissions verification

### Technical Details

- Built with TypeScript
- Commander.js for CLI framework
- Inquirer for interactive prompts
- Ora for beautiful spinners
- Chalk for colorful output
- Axios for API communication
- Node.js 18+ required

### Documentation

- Comprehensive README with examples
- Detailed command documentation
- Troubleshooting guide
- Development setup instructions

## [Unreleased]

### Planned Features

- [ ] Shell completion (bash, zsh, fish)
- [ ] Agent metrics and monitoring
- [ ] Export/import configuration
- [ ] Multiple project support
- [ ] Agent plugin system
- [ ] Performance profiling
- [ ] Network diagnostics
- [ ] Crash reporting
- [ ] Integration with CI/CD
- [ ] Docker support

---

[1.0.0]: https://github.com/Shjabbour/RemoteDevAI/releases/tag/cli-v1.0.0
