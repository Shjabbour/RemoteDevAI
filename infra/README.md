# RemoteDevAI Infrastructure

This directory contains all infrastructure-related files for RemoteDevAI, including Docker, Kubernetes, and CI/CD configurations.

## Directory Structure

```
infra/
├── docker/                 # Docker configurations
│   ├── docker-compose.yml  # Docker Compose for local development
│   ├── Dockerfile.cloud    # Cloud backend Dockerfile
│   ├── Dockerfile.desktop  # Desktop agent Dockerfile
│   ├── .env.example        # Environment variables template
│   └── init-db.sql         # Database initialization script
├── kubernetes/             # Kubernetes manifests
│   ├── namespace.yaml      # Kubernetes namespace
│   ├── configmap.yaml      # Configuration values
│   ├── secrets.yaml        # Secrets template (DO NOT commit actual secrets)
│   ├── postgres-deployment.yaml  # PostgreSQL database
│   ├── redis-deployment.yaml     # Redis cache
│   ├── cloud-deployment.yaml     # Cloud backend service
│   ├── cloud-service.yaml        # Cloud service definition
│   └── ingress.yaml        # Ingress configuration
└── github/                 # GitHub configurations (copied to .github/)
    ├── workflows/          # CI/CD workflows
    │   ├── ci.yml          # Continuous integration
    │   ├── deploy.yml      # Deployment pipeline
    │   └── release.yml     # Release automation
    ├── ISSUE_TEMPLATE/     # Issue templates
    │   ├── bug_report.md
    │   └── feature_request.md
    └── PULL_REQUEST_TEMPLATE.md
```

## Docker

### Local Development

Start all services with Docker Compose:

```bash
cd infra/docker
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- MinIO S3 storage (port 9000, console 9001)
- Cloud backend (port 3000, WebSocket 3001)

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cd infra/docker
cp .env.example .env
# Edit .env with your values
```

### Building Images

Build production images:

```bash
# Cloud backend
docker build -f infra/docker/Dockerfile.cloud -t remotedevai/cloud:latest .

# Desktop agent
docker build -f infra/docker/Dockerfile.desktop -t remotedevai/desktop:latest .
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Start only database services
docker-compose up -d postgres redis minio
```

## Kubernetes

### Prerequisites

- kubectl installed and configured
- Access to a Kubernetes cluster
- Docker registry access (for pushing images)

### Deployment Steps

1. Create namespace:
```bash
kubectl apply -f infra/kubernetes/namespace.yaml
```

2. Create ConfigMap:
```bash
kubectl apply -f infra/kubernetes/configmap.yaml
```

3. Create Secrets (update with your values first):
```bash
# Copy template and update values
cp infra/kubernetes/secrets.yaml infra/kubernetes/secrets.local.yaml
# Edit secrets.local.yaml with base64-encoded values
kubectl apply -f infra/kubernetes/secrets.local.yaml
```

4. Deploy databases:
```bash
kubectl apply -f infra/kubernetes/postgres-deployment.yaml
kubectl apply -f infra/kubernetes/redis-deployment.yaml
```

5. Deploy cloud service:
```bash
kubectl apply -f infra/kubernetes/cloud-deployment.yaml
kubectl apply -f infra/kubernetes/cloud-service.yaml
```

6. Configure ingress:
```bash
kubectl apply -f infra/kubernetes/ingress.yaml
```

### Kubernetes Commands

```bash
# Check deployment status
kubectl get pods -n remotedevai
kubectl get deployments -n remotedevai
kubectl get services -n remotedevai

# View logs
kubectl logs -f deployment/remotedevai-cloud -n remotedevai

# Scale deployment
kubectl scale deployment/remotedevai-cloud --replicas=5 -n remotedevai

# Update image
kubectl set image deployment/remotedevai-cloud \
  cloud=remotedevai/cloud:v1.2.0 -n remotedevai

# Rollback deployment
kubectl rollout undo deployment/remotedevai-cloud -n remotedevai

# Port forward for local access
kubectl port-forward service/remotedevai-cloud-service 3000:80 -n remotedevai
```

### Production Considerations

Before deploying to production:

1. Update secrets with secure values
2. Configure TLS certificates (cert-manager recommended)
3. Set up monitoring and logging
4. Configure backup for PostgreSQL
5. Set up Redis persistence
6. Review resource limits and requests
7. Configure horizontal pod autoscaling
8. Set up network policies
9. Configure pod security policies
10. Review ingress security settings

## CI/CD Workflows

### Continuous Integration (ci.yml)

Runs on every push and pull request:
- Lint code
- Type checking
- Run tests
- Build packages
- Security audit
- Docker build test

### Deployment (deploy.yml)

Deploys to staging/production:
- Builds Docker images
- Pushes to registry
- Updates Kubernetes deployments
- Runs smoke tests

Triggers:
- Push to `main` branch → staging
- Tag with `v*` → production
- Manual workflow dispatch

### Release (release.yml)

Automates releases:
- Creates GitHub release
- Builds CLI binaries
- Builds desktop installers
- Publishes to npm
- Updates documentation

Triggers:
- Push tag starting with `v*`
- Manual workflow dispatch

## Security Best Practices

### Secrets Management

1. Never commit actual secrets to version control
2. Use Kubernetes secrets for sensitive data
3. Rotate secrets regularly
4. Use separate secrets for different environments
5. Consider using external secret managers (Vault, AWS Secrets Manager)

### Docker Security

1. Use multi-stage builds to minimize image size
2. Run containers as non-root user
3. Scan images for vulnerabilities
4. Keep base images updated
5. Use specific version tags, not `latest`

### Kubernetes Security

1. Use RBAC for access control
2. Enable pod security policies
3. Use network policies to restrict traffic
4. Regularly update Kubernetes version
5. Use secrets instead of ConfigMaps for sensitive data
6. Enable audit logging
7. Use namespaces for isolation

## Monitoring and Logging

### Recommended Tools

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack or Loki
- **Tracing**: Jaeger or Zipkin
- **APM**: Datadog, New Relic, or Sentry

### Health Checks

All services expose health check endpoints:
- Cloud: `http://localhost:3000/health`

## Troubleshooting

### Docker Issues

```bash
# Check container logs
docker-compose logs [service-name]

# Check container status
docker-compose ps

# Restart a service
docker-compose restart [service-name]

# Clean up everything
docker-compose down -v
docker system prune -f
```

### Kubernetes Issues

```bash
# Check pod status
kubectl describe pod [pod-name] -n remotedevai

# View pod logs
kubectl logs [pod-name] -n remotedevai

# Execute command in pod
kubectl exec -it [pod-name] -n remotedevai -- sh

# Check events
kubectl get events -n remotedevai --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n remotedevai
kubectl top nodes
```

### Common Issues

1. **Database connection failed**
   - Check if PostgreSQL pod is running
   - Verify DATABASE_URL is correct
   - Check network connectivity

2. **Redis connection failed**
   - Verify Redis pod is running
   - Check REDIS_URL and password

3. **Image pull errors**
   - Verify registry credentials
   - Check image tag exists
   - Review ImagePullSecrets

4. **Pod not starting**
   - Check resource limits
   - Review init container logs
   - Verify environment variables

## Contributing

When adding infrastructure changes:

1. Update relevant documentation
2. Test in development environment first
3. Follow security best practices
4. Update CI/CD workflows if needed
5. Document breaking changes

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Helm Documentation](https://helm.sh/docs/)
