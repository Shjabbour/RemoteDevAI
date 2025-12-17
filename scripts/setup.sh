#!/bin/bash

# RemoteDevAI Setup Script
# This script sets up the development environment for RemoteDevAI

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup function
main() {
    print_info "Starting RemoteDevAI setup..."
    echo ""

    # Check prerequisites
    print_info "Checking prerequisites..."

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"

        # Check if version is >= 18
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | tr -d 'v')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_error "Node.js version 18 or higher is required. Current version: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed."
        exit 1
    fi

    # Check Git
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_success "Git found: $GIT_VERSION"
    else
        print_error "Git is not installed."
        exit 1
    fi

    # Check Docker (optional)
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
    else
        print_warning "Docker is not installed. Docker is optional but recommended for development."
    fi

    # Check Docker Compose (optional)
    if command_exists docker-compose || command_exists docker compose; then
        print_success "Docker Compose found"
    else
        print_warning "Docker Compose is not installed. It's recommended for running dependencies."
    fi

    echo ""
    print_info "Installing dependencies..."

    # Install root dependencies
    print_info "Installing root dependencies..."
    npm install

    # Install workspace dependencies
    print_info "Installing workspace dependencies..."
    npm install --workspaces

    print_success "Dependencies installed successfully!"

    echo ""
    print_info "Setting up environment files..."

    # Create .env file from .env.example if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please update .env with your actual configuration values"
        else
            print_warning ".env.example not found. Skipping .env creation."
        fi
    else
        print_info ".env file already exists. Skipping."
    fi

    # Create Docker .env file
    if [ ! -f "infra/docker/.env" ]; then
        if [ -f "infra/docker/.env.example" ]; then
            cp infra/docker/.env.example infra/docker/.env
            print_success "Created infra/docker/.env file"
        fi
    else
        print_info "infra/docker/.env file already exists. Skipping."
    fi

    echo ""
    print_info "Generating Prisma client..."

    # Generate Prisma client if schema exists
    if [ -f "packages/cloud/prisma/schema.prisma" ]; then
        cd packages/cloud
        npx prisma generate
        cd ../..
        print_success "Prisma client generated successfully!"
    else
        print_warning "Prisma schema not found. Skipping Prisma client generation."
    fi

    echo ""
    print_info "Building packages..."

    # Build shared package first
    print_info "Building @remotedevai/shared..."
    npm run build -w @remotedevai/shared

    # Build other packages
    print_info "Building all packages..."
    npm run build

    print_success "All packages built successfully!"

    echo ""
    print_info "Setting up database (if Docker is available)..."

    if command_exists docker && (command_exists docker-compose || command_exists docker compose); then
        read -p "Do you want to start the database services with Docker? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd infra/docker
            if command_exists docker-compose; then
                docker-compose up -d postgres redis minio
            else
                docker compose up -d postgres redis minio
            fi
            cd ../..
            print_success "Database services started successfully!"

            print_info "Waiting for database to be ready..."
            sleep 5

            print_info "Running database migrations..."
            cd packages/cloud
            npx prisma migrate dev --name init
            cd ../..
            print_success "Database migrations completed!"
        fi
    fi

    echo ""
    print_success "Setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Update .env files with your configuration"
    echo "  2. Run 'npm run dev' to start development servers"
    echo "  3. Run 'npm test' to run tests"
    echo ""
    print_info "For more information, see the README.md file"
}

# Run main function
main "$@"
