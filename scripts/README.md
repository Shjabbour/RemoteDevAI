# RemoteDevAI Scripts

This directory contains utility scripts for development, building, and deployment of RemoteDevAI.

## Available Scripts

### Setup Scripts

#### setup.sh (Linux/macOS)

Initial setup script for Unix-based systems.

```bash
bash scripts/setup.sh
```

**What it does:**
- Checks prerequisites (Node.js, npm, Git, Docker)
- Installs all dependencies
- Creates environment files from templates
- Generates Prisma client
- Builds all packages
- Optionally starts Docker services
- Runs database migrations

**Requirements:**
- Node.js 18 or higher
- npm 9 or higher
- Git
- Docker (optional)

#### setup.ps1 (Windows)

Initial setup script for Windows PowerShell.

```powershell
.\scripts\setup.ps1
```

**What it does:**
Same as setup.sh but for Windows environments.

**Requirements:**
- PowerShell 5.1 or higher
- Node.js 18 or higher
- npm 9 or higher
- Git
- Docker (optional)

### Development Scripts

#### dev.sh

Starts the development environment.

```bash
bash scripts/dev.sh
# or
make dev
```

**What it does:**
- Checks for .env file
- Optionally starts Docker services
- Generates Prisma client
- Starts all development servers with hot reload

**Environment:**
- Runs all packages in development mode
- Enables hot module replacement
- Shows detailed error messages
- Watches for file changes

#### generate-types.sh

Generates TypeScript types from Prisma schema.

```bash
bash scripts/generate-types.sh
# or
make generate-types
```

**What it does:**
- Generates Prisma client
- Formats Prisma schema
- Validates Prisma schema
- Generates additional custom types (if configured)

**When to run:**
- After modifying Prisma schema
- After pulling schema changes from Git
- When setting up a new development environment

### Build Scripts

#### build.sh

Builds all packages for production.

```bash
bash scripts/build.sh
# or
make build
```

**What it does:**
- Cleans previous build artifacts
- Generates Prisma client
- Builds packages in dependency order:
  1. @remotedevai/shared
  2. @remotedevai/cloud
  3. @remotedevai/desktop
  4. @remotedevai/web (if exists)
  5. @remotedevai/cli (if exists)

**Build outputs:**
- TypeScript compiled to JavaScript
- Source maps generated
- Type declarations generated
- Assets bundled and optimized

### Deployment Scripts

#### deploy-cloud.sh

Deploys the cloud service to Kubernetes.

```bash
bash scripts/deploy-cloud.sh [environment] [version]
# or
make deploy-staging
make deploy-production
```

**Arguments:**
- `environment`: Target environment (default: production)
- `version`: Docker image version (default: latest)

**Examples:**
```bash
# Deploy latest to production
bash scripts/deploy-cloud.sh production latest

# Deploy specific version to staging
bash scripts/deploy-cloud.sh staging v1.2.3

# Using make commands
make deploy-staging
make deploy-production
```

**What it does:**
1. Confirms deployment
2. Checks for required tools (kubectl, docker)
3. Builds Docker image
4. Tags image with version
5. Pushes image to registry
6. Applies Kubernetes manifests
7. Waits for deployment to complete
8. Shows deployment status and logs

**Requirements:**
- Docker installed and running
- kubectl configured with cluster access
- Docker registry credentials
- Appropriate Kubernetes permissions

**Environment Variables:**
- `DOCKER_REGISTRY`: Docker registry URL (default: docker.io)
- `DOCKER_USERNAME`: Docker registry username (default: remotedevai)
- `KUBECTL_NAMESPACE`: Kubernetes namespace (default: remotedevai)

## Script Permissions

All scripts should be executable. If you encounter permission errors:

```bash
# Make a script executable
chmod +x scripts/setup.sh
chmod +x scripts/dev.sh
chmod +x scripts/build.sh
chmod +x scripts/deploy-cloud.sh
chmod +x scripts/generate-types.sh

# Or make all scripts executable at once
chmod +x scripts/*.sh
```

## Using Makefile

For convenience, use the Makefile instead of running scripts directly:

```bash
# View all available commands
make help

# Setup
make install
make setup

# Development
make dev
make build
make generate-types

# Testing
make test
make lint
make format

# Docker
make docker-up
make docker-down
make docker-logs

# Database
make db-migrate
make db-seed
make db-studio

# Deployment
make deploy-staging
make deploy-production
```

## Cross-Platform Compatibility

### Windows Users

#### Using Git Bash
```bash
# Works on Windows with Git Bash
bash scripts/setup.sh
bash scripts/dev.sh
bash scripts/build.sh
```

#### Using PowerShell
```powershell
# Use PowerShell versions
.\scripts\setup.ps1

# Or use WSL
wsl bash scripts/setup.sh
```

#### Using WSL (Windows Subsystem for Linux)
```bash
# All Unix scripts work in WSL
bash scripts/setup.sh
bash scripts/dev.sh
bash scripts/build.sh
```

### macOS/Linux Users

All `.sh` scripts work natively:

```bash
bash scripts/setup.sh
bash scripts/dev.sh
bash scripts/build.sh
bash scripts/deploy-cloud.sh
```

## Environment Variables

Scripts use these environment variables (set in `.env` or shell):

### Development
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### Deployment
- `DOCKER_REGISTRY`: Docker registry URL
- `DOCKER_USERNAME`: Docker registry username
- `DOCKER_PASSWORD`: Docker registry password
- `KUBE_CONFIG`: Kubernetes configuration path

## Troubleshooting

### Permission Denied

```bash
# Error: Permission denied
bash: ./scripts/setup.sh: Permission denied

# Solution: Make script executable
chmod +x scripts/setup.sh
```

### Command Not Found

```bash
# Error: docker: command not found

# Solution: Install Docker
# macOS: brew install --cask docker
# Ubuntu: apt-get install docker.io
# Windows: Download from docker.com
```

### Node Version Mismatch

```bash
# Error: Node.js version 18 or higher is required

# Solution: Install/update Node.js
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

### Database Connection Failed

```bash
# Error: Can't reach database server

# Solution: Start Docker services
make docker-up
# or
cd infra/docker && docker-compose up -d
```

### Prisma Client Not Found

```bash
# Error: @prisma/client not found

# Solution: Generate Prisma client
bash scripts/generate-types.sh
# or
make generate-types
```

## CI/CD Integration

These scripts are used in CI/CD pipelines:

### GitHub Actions

```yaml
# .github/workflows/ci.yml
- name: Setup
  run: bash scripts/setup.sh

- name: Build
  run: bash scripts/build.sh

- name: Deploy
  run: bash scripts/deploy-cloud.sh production v1.0.0
```

### GitLab CI

```yaml
# .gitlab-ci.yml
build:
  script:
    - bash scripts/setup.sh
    - bash scripts/build.sh
```

### Jenkins

```groovy
// Jenkinsfile
stage('Build') {
  steps {
    sh 'bash scripts/setup.sh'
    sh 'bash scripts/build.sh'
  }
}
```

## Best Practices

1. **Always run setup first** when cloning the repository
2. **Keep scripts executable** with proper permissions
3. **Use Makefile** for common operations
4. **Check prerequisites** before running scripts
5. **Review output** for errors and warnings
6. **Update .env** with your actual configuration
7. **Test locally** before deploying to production
8. **Use version tags** for production deployments

## Adding New Scripts

When adding new scripts:

1. Choose appropriate shell (bash for Unix, PowerShell for Windows)
2. Add help text and usage instructions
3. Include error handling and validation
4. Make script executable: `chmod +x scripts/new-script.sh`
5. Update this README
6. Add corresponding Makefile target
7. Test on multiple platforms

## Resources

- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [GNU Make Manual](https://www.gnu.org/software/make/manual/)
