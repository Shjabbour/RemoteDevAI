#!/bin/bash

# RemoteDevAI CLI - CI/CD Integration Example
# This script shows how to use RemoteDevAI CLI in CI/CD pipelines

set -e  # Exit on error

echo "RemoteDevAI CI/CD Integration"
echo "=============================="
echo ""

# Check if API key is provided via environment variable
if [ -z "$REMOTEDEVAI_API_KEY" ]; then
    echo "❌ Error: REMOTEDEVAI_API_KEY environment variable is not set"
    echo "Please set it in your CI/CD environment variables"
    exit 1
fi

# Install CLI
echo "1. Installing RemoteDevAI CLI..."
npm install -g @remotedevai/cli
echo "✅ CLI installed"
echo ""

# Login using API key
echo "2. Authenticating..."
remotedevai login --api-key "$REMOTEDEVAI_API_KEY"
echo "✅ Authenticated"
echo ""

# Initialize project (if PROJECT_ID is provided)
if [ -n "$REMOTEDEVAI_PROJECT_ID" ]; then
    echo "3. Connecting to project..."
    remotedevai init --project-id "$REMOTEDEVAI_PROJECT_ID" --skip-download
    echo "✅ Connected to project: $REMOTEDEVAI_PROJECT_ID"
    echo ""
fi

# Run diagnostics
echo "4. Running diagnostics..."
remotedevai doctor --verbose
echo ""

# Check agent status (for monitoring)
echo "5. Checking agent status..."
remotedevai status --json > agent-status.json
cat agent-status.json
echo ""

# Optional: Deploy configuration
if [ -f "remotedevai.config.json" ]; then
    echo "6. Deploying configuration..."
    # Read configuration from file and apply
    API_URL=$(jq -r '.apiUrl // empty' remotedevai.config.json)
    LOG_LEVEL=$(jq -r '.logLevel // empty' remotedevai.config.json)

    if [ -n "$API_URL" ]; then
        remotedevai config --set apiUrl "$API_URL"
    fi

    if [ -n "$LOG_LEVEL" ]; then
        remotedevai config --set logLevel "$LOG_LEVEL"
    fi

    echo "✅ Configuration deployed"
    echo ""
fi

echo "=============================="
echo "✅ CI/CD integration complete"
echo "=============================="
