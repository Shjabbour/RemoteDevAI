#!/bin/bash

# RemoteDevAI Build Script
# Builds all packages for production

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main function
main() {
    print_info "Building RemoteDevAI packages..."

    # Clean previous builds
    print_info "Cleaning previous builds..."
    npm run clean --if-present

    # Generate Prisma client
    if [ -f "packages/cloud/prisma/schema.prisma" ]; then
        print_info "Generating Prisma client..."
        cd packages/cloud
        npx prisma generate
        cd ../..
        print_success "Prisma client generated"
    fi

    # Build shared package first (dependency for other packages)
    print_info "Building @remotedevai/shared..."
    npm run build -w @remotedevai/shared
    print_success "@remotedevai/shared built successfully"

    # Build cloud package
    print_info "Building @remotedevai/cloud..."
    npm run build -w @remotedevai/cloud
    print_success "@remotedevai/cloud built successfully"

    # Build desktop package
    print_info "Building @remotedevai/desktop..."
    npm run build -w @remotedevai/desktop
    print_success "@remotedevai/desktop built successfully"

    # Build web package
    if [ -d "packages/web" ]; then
        print_info "Building @remotedevai/web..."
        npm run build -w @remotedevai/web
        print_success "@remotedevai/web built successfully"
    fi

    # Build CLI package
    if [ -d "packages/cli" ]; then
        print_info "Building @remotedevai/cli..."
        npm run build -w @remotedevai/cli
        print_success "@remotedevai/cli built successfully"
    fi

    print_success "All packages built successfully!"
}

# Error handler
trap 'print_error "Build failed!"; exit 1' ERR

main "$@"
