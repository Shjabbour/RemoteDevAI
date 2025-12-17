# RemoteDevAI Setup Script (PowerShell)
# This script sets up the development environment for RemoteDevAI on Windows

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Helper functions
function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if a command exists
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Main setup function
function Start-Setup {
    Write-Info "Starting RemoteDevAI setup..."
    Write-Host ""

    # Check prerequisites
    Write-Info "Checking prerequisites..."

    # Check Node.js
    if (Test-Command node) {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"

        # Check if version is >= 18
        $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($nodeMajor -lt 18) {
            Write-Error "Node.js version 18 or higher is required. Current version: $nodeVersion"
            exit 1
        }
    }
    else {
        Write-Error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    }

    # Check npm
    if (Test-Command npm) {
        $npmVersion = npm --version
        Write-Success "npm found: $npmVersion"
    }
    else {
        Write-Error "npm is not installed."
        exit 1
    }

    # Check Git
    if (Test-Command git) {
        $gitVersion = git --version
        Write-Success "Git found: $gitVersion"
    }
    else {
        Write-Error "Git is not installed."
        exit 1
    }

    # Check Docker (optional)
    if (Test-Command docker) {
        $dockerVersion = docker --version
        Write-Success "Docker found: $dockerVersion"
    }
    else {
        Write-Warning "Docker is not installed. Docker is optional but recommended for development."
    }

    # Check Docker Compose (optional)
    if ((Test-Command docker-compose) -or (Test-Command docker)) {
        Write-Success "Docker Compose found"
    }
    else {
        Write-Warning "Docker Compose is not installed. It's recommended for running dependencies."
    }

    Write-Host ""
    Write-Info "Installing dependencies..."

    # Install root dependencies
    Write-Info "Installing root dependencies..."
    npm install

    # Install workspace dependencies
    Write-Info "Installing workspace dependencies..."
    npm install --workspaces

    Write-Success "Dependencies installed successfully!"

    Write-Host ""
    Write-Info "Setting up environment files..."

    # Create .env file from .env.example if it doesn't exist
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Success "Created .env file from .env.example"
            Write-Warning "Please update .env with your actual configuration values"
        }
        else {
            Write-Warning ".env.example not found. Skipping .env creation."
        }
    }
    else {
        Write-Info ".env file already exists. Skipping."
    }

    # Create Docker .env file
    if (-not (Test-Path "infra/docker/.env")) {
        if (Test-Path "infra/docker/.env.example") {
            Copy-Item "infra/docker/.env.example" "infra/docker/.env"
            Write-Success "Created infra/docker/.env file"
        }
    }
    else {
        Write-Info "infra/docker/.env file already exists. Skipping."
    }

    Write-Host ""
    Write-Info "Generating Prisma client..."

    # Generate Prisma client if schema exists
    if (Test-Path "packages/cloud/prisma/schema.prisma") {
        Push-Location "packages/cloud"
        npx prisma generate
        Pop-Location
        Write-Success "Prisma client generated successfully!"
    }
    else {
        Write-Warning "Prisma schema not found. Skipping Prisma client generation."
    }

    Write-Host ""
    Write-Info "Building packages..."

    # Build shared package first
    Write-Info "Building @remotedevai/shared..."
    npm run build -w @remotedevai/shared

    # Build other packages
    Write-Info "Building all packages..."
    npm run build

    Write-Success "All packages built successfully!"

    Write-Host ""
    Write-Info "Setting up database (if Docker is available)..."

    if ((Test-Command docker) -and ((Test-Command docker-compose) -or (Test-Command docker))) {
        $response = Read-Host "Do you want to start the database services with Docker? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Push-Location "infra/docker"
            try {
                if (Test-Command docker-compose) {
                    docker-compose up -d postgres redis minio
                }
                else {
                    docker compose up -d postgres redis minio
                }
                Write-Success "Database services started successfully!"

                Write-Info "Waiting for database to be ready..."
                Start-Sleep -Seconds 5

                Write-Info "Running database migrations..."
                Push-Location "../../packages/cloud"
                npx prisma migrate dev --name init
                Pop-Location
                Write-Success "Database migrations completed!"
            }
            finally {
                Pop-Location
            }
        }
    }

    Write-Host ""
    Write-Success "Setup completed successfully!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Update .env files with your configuration"
    Write-Host "  2. Run 'npm run dev' to start development servers"
    Write-Host "  3. Run 'npm test' to run tests"
    Write-Host ""
    Write-Info "For more information, see the README.md file"
}

# Run main function
try {
    Start-Setup
}
catch {
    Write-Error "Setup failed: $_"
    exit 1
}
