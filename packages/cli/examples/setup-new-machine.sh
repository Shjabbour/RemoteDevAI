#!/bin/bash

# RemoteDevAI CLI - New Machine Setup Script
# Automates the complete setup process on a new development machine

set -e  # Exit on error

echo "=========================================="
echo "RemoteDevAI - New Machine Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Step 1: Check Node.js
echo "Step 1: Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    print_info "Please install Node.js 18 or higher: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version is too old ($NODE_VERSION)"
    print_info "Please upgrade to Node.js 18 or higher"
    exit 1
fi

print_success "Node.js $(node -v) is installed"
echo ""

# Step 2: Install RemoteDevAI CLI
echo "Step 2: Installing RemoteDevAI CLI..."
if command -v remotedevai &> /dev/null; then
    print_info "RemoteDevAI CLI is already installed"
    CURRENT_VERSION=$(remotedevai --version)
    print_info "Current version: $CURRENT_VERSION"

    read -p "Do you want to update to the latest version? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm update -g @remotedevai/cli
        print_success "Updated to latest version"
    fi
else
    npm install -g @remotedevai/cli
    print_success "RemoteDevAI CLI installed successfully"
fi
echo ""

# Step 3: Verify installation
echo "Step 3: Verifying installation..."
if ! command -v remotedevai &> /dev/null; then
    print_error "Installation failed - command not found"
    exit 1
fi

VERSION=$(remotedevai --version)
print_success "RemoteDevAI CLI v$VERSION is ready"
echo ""

# Step 4: Login
echo "Step 4: Authentication..."
if remotedevai config --get email &> /dev/null; then
    EMAIL=$(remotedevai config --get email)
    print_info "Already authenticated as: $EMAIL"

    read -p "Do you want to re-authenticate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        remotedevai logout
        remotedevai login
    fi
else
    print_info "Please login to your RemoteDevAI account"
    remotedevai login
fi
echo ""

# Step 5: Initialize project
echo "Step 5: Project initialization..."
if remotedevai config --get projectId &> /dev/null; then
    PROJECT_ID=$(remotedevai config --get projectId)
    print_info "Already connected to project: $PROJECT_ID"

    read -p "Do you want to connect to a different project? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        remotedevai init
    fi
else
    print_info "Let's set up your project"
    remotedevai init
fi
echo ""

# Step 6: Start agent
echo "Step 6: Starting desktop agent..."
if remotedevai status | grep -q "Status.*Running"; then
    print_info "Agent is already running"
else
    remotedevai start
    print_success "Agent started successfully"
fi
echo ""

# Step 7: Verify everything is working
echo "Step 7: Running diagnostics..."
remotedevai doctor
echo ""

# Final summary
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Your RemoteDevAI environment is ready!"
echo ""
echo "Quick reference:"
echo "  • Check status:     remotedevai status"
echo "  • View logs:        remotedevai logs -f"
echo "  • Stop agent:       remotedevai stop"
echo "  • Get help:         remotedevai --help"
echo ""
echo "Next steps:"
echo "  1. Open https://app.remotedevai.com to see your agent"
echo "  2. Install IDE extension for your editor"
echo "  3. Start coding with AI assistance!"
echo ""
print_success "Happy coding! 🚀"
echo ""
