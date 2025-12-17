#!/bin/bash

# RemoteDevAI Type Generation Script
# Generates TypeScript types from Prisma schema

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
    print_info "Generating TypeScript types from Prisma schema..."

    # Check if Prisma schema exists
    if [ ! -f "packages/cloud/prisma/schema.prisma" ]; then
        print_error "Prisma schema not found at packages/cloud/prisma/schema.prisma"
        exit 1
    fi

    # Generate Prisma client
    print_info "Generating Prisma client..."
    cd packages/cloud
    npx prisma generate
    cd ../..
    print_success "Prisma client generated successfully"

    # Format Prisma schema
    print_info "Formatting Prisma schema..."
    cd packages/cloud
    npx prisma format
    cd ../..
    print_success "Prisma schema formatted"

    # Validate Prisma schema
    print_info "Validating Prisma schema..."
    cd packages/cloud
    npx prisma validate
    cd ../..
    print_success "Prisma schema validated"

    # Generate additional types if needed
    if [ -f "packages/shared/src/types/generator.ts" ]; then
        print_info "Generating additional types..."
        npm run generate:types -w @remotedevai/shared
        print_success "Additional types generated"
    fi

    print_success "All types generated successfully!"
}

# Error handler
trap 'print_error "Type generation failed!"; exit 1' ERR

main "$@"
