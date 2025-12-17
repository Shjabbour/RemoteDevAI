#!/bin/bash

# RemoteDevAI Mobile App Setup Script
# This script sets up the mobile app for development

set -e

echo "🚀 Setting up RemoteDevAI Mobile App..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required"
    echo "   Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v)"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Setup environment
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  Please update the following in .env:"
    echo "   - EXPO_PUBLIC_API_URL (your backend URL)"
    echo "   - EXPO_PUBLIC_WS_URL (your WebSocket URL)"
    echo ""
else
    echo "⚠️  .env file already exists, skipping..."
    echo ""
fi

# Check for Expo CLI
if ! command -v expo &> /dev/null; then
    echo "⚠️  Expo CLI not found. Installing globally..."
    npm install -g expo-cli
    echo "✅ Expo CLI installed"
    echo ""
fi

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env with your backend URL"
echo "  2. Run 'npm start' to start the development server"
echo "  3. Press 'i' for iOS or 'a' for Android"
echo ""
echo "For more information, see QUICKSTART.md"
