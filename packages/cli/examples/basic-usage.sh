#!/bin/bash

# RemoteDevAI CLI - Basic Usage Example
# This script demonstrates the basic workflow for using RemoteDevAI CLI

set -e  # Exit on error

echo "========================================"
echo "RemoteDevAI CLI - Basic Usage Example"
echo "========================================"
echo ""

# Check if CLI is installed
echo "1. Checking if RemoteDevAI CLI is installed..."
if ! command -v remotedevai &> /dev/null; then
    echo "❌ RemoteDevAI CLI is not installed"
    echo "Install with: npm install -g @remotedevai/cli"
    exit 1
fi
echo "✅ RemoteDevAI CLI is installed"
echo ""

# Show version
echo "2. CLI Version:"
remotedevai --version
echo ""

# Check authentication status
echo "3. Checking authentication status..."
if remotedevai config --get email &> /dev/null; then
    EMAIL=$(remotedevai config --get email)
    echo "✅ Already authenticated as: $EMAIL"
else
    echo "⚠️  Not authenticated"
    echo "Please run: remotedevai login"
    exit 1
fi
echo ""

# Check agent status
echo "4. Checking agent status..."
remotedevai status
echo ""

# Start agent if not running
echo "5. Ensuring agent is running..."
if remotedevai status | grep -q "Status.*Not running"; then
    echo "Starting agent..."
    remotedevai start
    echo "✅ Agent started"
else
    echo "✅ Agent is already running"
fi
echo ""

# Show recent logs
echo "6. Recent agent logs:"
echo "---"
remotedevai logs --lines 10
echo "---"
echo ""

# Check for updates
echo "7. Checking for updates..."
remotedevai update --check
echo ""

echo "========================================"
echo "✅ Basic workflow complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  • View live logs: remotedevai logs --follow"
echo "  • Check status: remotedevai status"
echo "  • Stop agent: remotedevai stop"
echo ""
