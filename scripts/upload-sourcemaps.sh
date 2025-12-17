#!/bin/bash

##
# Upload Source Maps to Sentry
#
# This script uploads source maps to Sentry after a production build.
# It should be run as part of your CI/CD pipeline after building the application.
#
# Prerequisites:
# - Sentry CLI installed (npm install -g @sentry/cli)
# - SENTRY_AUTH_TOKEN environment variable set
# - SENTRY_ORG environment variable set
# - SENTRY_PROJECT environment variable set
#
# Usage:
#   ./scripts/upload-sourcemaps.sh [app-name] [version]
#
# Examples:
#   ./scripts/upload-sourcemaps.sh cloud 1.0.0
#   ./scripts/upload-sourcemaps.sh web 1.0.0
##

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Sentry CLI is installed
if ! command -v sentry-cli &> /dev/null; then
    print_error "Sentry CLI not found. Install it with: npm install -g @sentry/cli"
    exit 1
fi

# Check required environment variables
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    print_error "SENTRY_AUTH_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$SENTRY_ORG" ]; then
    print_error "SENTRY_ORG environment variable is not set"
    exit 1
fi

# Get app name and version from arguments or environment
APP_NAME="${1:-$SENTRY_APP}"
VERSION="${2:-$SENTRY_RELEASE}"

if [ -z "$APP_NAME" ]; then
    print_error "App name not provided. Usage: $0 [app-name] [version]"
    exit 1
fi

if [ -z "$VERSION" ]; then
    print_error "Version not provided. Usage: $0 [app-name] [version]"
    exit 1
fi

# Set project name based on app
case "$APP_NAME" in
    cloud)
        PROJECT="${SENTRY_PROJECT:-remotedevai-cloud}"
        DIST_DIR="apps/cloud/dist"
        ;;
    web)
        PROJECT="${SENTRY_PROJECT:-remotedevai-web}"
        DIST_DIR="apps/web/.next"
        ;;
    mobile)
        PROJECT="${SENTRY_PROJECT:-remotedevai-mobile}"
        DIST_DIR="apps/mobile/.expo"
        ;;
    desktop)
        PROJECT="${SENTRY_PROJECT:-remotedevai-desktop}"
        DIST_DIR="apps/desktop/dist"
        ;;
    *)
        print_error "Unknown app name: $APP_NAME. Valid options: cloud, web, mobile, desktop"
        exit 1
        ;;
esac

print_info "Uploading source maps for $APP_NAME@$VERSION to Sentry"
print_info "Organization: $SENTRY_ORG"
print_info "Project: $PROJECT"
print_info "Distribution directory: $DIST_DIR"

# Check if distribution directory exists
if [ ! -d "$DIST_DIR" ]; then
    print_error "Distribution directory not found: $DIST_DIR"
    print_error "Please build the application first"
    exit 1
fi

# Create a new release
print_info "Creating release $VERSION..."
sentry-cli releases new "$VERSION" \
    --org "$SENTRY_ORG" \
    --project "$PROJECT" \
    2>&1 || print_warning "Release may already exist"

# Associate commits with the release (if in a git repository)
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_info "Associating commits with release..."
    sentry-cli releases set-commits "$VERSION" --auto \
        --org "$SENTRY_ORG" \
        --project "$PROJECT" \
        2>&1 || print_warning "Failed to associate commits"
fi

# Upload source maps
print_info "Uploading source maps from $DIST_DIR..."
sentry-cli sourcemaps upload \
    --org "$SENTRY_ORG" \
    --project "$PROJECT" \
    --release "$VERSION" \
    "$DIST_DIR" \
    2>&1

# Finalize the release
print_info "Finalizing release..."
sentry-cli releases finalize "$VERSION" \
    --org "$SENTRY_ORG" \
    --project "$PROJECT" \
    2>&1

# Deploy notification (optional)
if [ -n "$DEPLOY_ENV" ]; then
    print_info "Creating deploy for environment: $DEPLOY_ENV"
    sentry-cli releases deploys "$VERSION" new \
        --env "$DEPLOY_ENV" \
        --org "$SENTRY_ORG" \
        --project "$PROJECT" \
        2>&1
fi

print_info "✓ Source maps uploaded successfully!"
print_info "View release: https://sentry.io/organizations/$SENTRY_ORG/releases/$VERSION/"
