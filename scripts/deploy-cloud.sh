#!/bin/bash

# RemoteDevAI Cloud Deployment Script
# Deploys the cloud service to production

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"docker.io"}
DOCKER_USERNAME=${DOCKER_USERNAME:-"remotedevai"}
IMAGE_NAME="remotedevai/cloud"
KUBECTL_NAMESPACE="remotedevai"

# Parse arguments
ENVIRONMENT=${1:-"production"}
VERSION=${2:-"latest"}

print_info "Deploying RemoteDevAI Cloud to $ENVIRONMENT (version: $VERSION)"

# Confirm deployment
read -p "Are you sure you want to deploy to $ENVIRONMENT? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 0
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl to deploy."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker to build images."
    exit 1
fi

# Build Docker image
print_info "Building Docker image..."
docker build -f infra/docker/Dockerfile.cloud -t ${IMAGE_NAME}:${VERSION} .
print_success "Docker image built successfully"

# Tag image
print_info "Tagging image..."
docker tag ${IMAGE_NAME}:${VERSION} ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}

if [ "$VERSION" != "latest" ]; then
    docker tag ${IMAGE_NAME}:${VERSION} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
fi

print_success "Image tagged successfully"

# Push to registry
print_info "Pushing image to registry..."
docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}

if [ "$VERSION" != "latest" ]; then
    docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
fi

print_success "Image pushed to registry"

# Apply Kubernetes manifests
print_info "Applying Kubernetes manifests..."

# Create namespace if it doesn't exist
kubectl create namespace ${KUBECTL_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
kubectl apply -f infra/kubernetes/configmap.yaml

# Apply Secrets (if not already applied)
if kubectl get secret remotedevai-secrets -n ${KUBECTL_NAMESPACE} &> /dev/null; then
    print_info "Secrets already exist, skipping..."
else
    print_warning "Secrets not found. Please apply secrets manually:"
    print_warning "kubectl apply -f infra/kubernetes/secrets.yaml"
    read -p "Continue without secrets? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Apply PostgreSQL
kubectl apply -f infra/kubernetes/postgres-deployment.yaml

# Apply Redis
kubectl apply -f infra/kubernetes/redis-deployment.yaml

# Apply Cloud deployment
kubectl apply -f infra/kubernetes/cloud-deployment.yaml

# Apply Cloud service
kubectl apply -f infra/kubernetes/cloud-service.yaml

# Apply Ingress
kubectl apply -f infra/kubernetes/ingress.yaml

print_success "Kubernetes manifests applied"

# Wait for deployment to be ready
print_info "Waiting for deployment to be ready..."
kubectl rollout status deployment/remotedevai-cloud -n ${KUBECTL_NAMESPACE} --timeout=5m

print_success "Deployment completed successfully!"

# Show deployment info
print_info "Deployment information:"
kubectl get pods -n ${KUBECTL_NAMESPACE} -l app=remotedevai-cloud
kubectl get svc -n ${KUBECTL_NAMESPACE} remotedevai-cloud-service

print_info "To view logs, run:"
echo "  kubectl logs -f deployment/remotedevai-cloud -n ${KUBECTL_NAMESPACE}"

print_info "To check deployment status, run:"
echo "  kubectl get deployment remotedevai-cloud -n ${KUBECTL_NAMESPACE}"
