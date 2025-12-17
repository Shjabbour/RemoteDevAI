#!/bin/bash

# MCP Tools Setup Script
# Automated setup for the MCP tools package

set -e

echo "========================================="
echo "MCP Tools Setup Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version must be >= 18.0.0${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠ FFmpeg is not installed${NC}"
    echo "FFmpeg is required for video processing features"
    echo ""
    echo "Install FFmpeg:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: choco install ffmpeg"
    echo ""
    read -p "Continue without FFmpeg? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ FFmpeg $(ffmpeg -version | head -1 | cut -d' ' -f3)${NC}"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building TypeScript..."
npm run build

echo ""
echo "Creating directories..."
mkdir -p recordings
mkdir -p logs
mkdir -p tmp

echo ""
echo "Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo "Please review and update .env with your settings"
else
    echo -e "${YELLOW}⚠ .env already exists${NC}"
fi

echo ""
echo "Installing Playwright browsers..."
npx playwright install chromium

echo ""
echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review and update .env file"
echo "  2. Run 'npm start' to start the MCP server"
echo "  3. Run 'npm run dev' for development mode"
echo "  4. Check examples/usage.ts for examples"
echo ""
echo "Documentation:"
echo "  - README.md - Getting started"
echo "  - docs/API.md - API reference"
echo "  - docs/QUICKSTART.md - Quick start guide"
echo ""
echo "Happy coding!"
