#!/bin/bash

# RemoteDevAI Development Script
# Starts the development environment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker services are running
check_docker_services() {
    if command_exists docker; then
        print_info "Checking Docker services..."

        # Check if postgres is running
        if docker ps | grep -q remotedevai-postgres; then
            print_success "PostgreSQL is running"
        else
            print_warning "PostgreSQL is not running"
            read -p "Do you want to start Docker services? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Starting Docker services..."
                cd infra/docker
                if command_exists docker-compose; then
                    docker-compose up -d
                else
                    docker compose up -d
                fi
                cd ../..
                print_success "Docker services started"
                print_info "Waiting for services to be ready..."
                sleep 5
            fi
        fi
    fi
}

# Main function
main() {
    print_info "Starting RemoteDevAI development environment..."

    # Check for .env file
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env file"
        fi
    fi

    # Check Docker services
    check_docker_services

    # Generate Prisma client if needed
    if [ -f "packages/cloud/prisma/schema.prisma" ]; then
        print_info "Generating Prisma client..."
        cd packages/cloud
        npx prisma generate
        cd ../..
    fi

    # Start development servers
    print_info "Starting development servers..."
    print_info "This will start all packages in development mode"
    print_info "Press Ctrl+C to stop all servers"
    echo ""

    npm run dev
}

main "$@"
