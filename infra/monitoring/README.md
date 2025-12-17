# RemoteDevAI Monitoring Setup

This directory contains the monitoring and observability stack for RemoteDevAI.

## Components

### Prometheus
- **Purpose**: Metrics collection and storage
- **Port**: 9090
- **URL**: http://localhost:9090

Prometheus scrapes metrics from:
- RemoteDevAI Cloud API (`/metrics` endpoint)
- Node Exporter (system metrics)
- PostgreSQL Exporter (database metrics)
- cAdvisor (container metrics)

### Grafana
- **Purpose**: Metrics visualization and dashboards
- **Port**: 3001
- **URL**: http://localhost:3001
- **Default credentials**: admin/admin (change in production!)

Pre-configured dashboards:
- API Metrics Dashboard
- System Metrics Dashboard
- Business Metrics Dashboard

### AlertManager
- **Purpose**: Alert routing and notification management
- **Port**: 9093
- **URL**: http://localhost:9093

Configured notification channels:
- Slack
- Email
- PagerDuty
- Webhooks

### Node Exporter
- **Purpose**: System-level metrics (CPU, memory, disk, network)
- **Port**: 9100

### PostgreSQL Exporter
- **Purpose**: Database metrics (connections, queries, performance)
- **Port**: 9187

### cAdvisor
- **Purpose**: Container metrics (Docker)
- **Port**: 8080

## Quick Start

### Starting the Monitoring Stack

```bash
cd infra/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Stopping the Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml down
```

### Viewing Logs

```bash
# All services
docker-compose -f docker-compose.monitoring.yml logs -f

# Specific service
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
```

## Configuration

### Prometheus Configuration

Edit `prometheus/prometheus.yml` to:
- Add new scrape targets
- Adjust scrape intervals
- Configure service discovery

### Alert Rules

Edit `prometheus/alert_rules.yml` to:
- Add new alert rules
- Modify alert thresholds
- Configure alert conditions

### AlertManager Configuration

Edit `alertmanager/alertmanager.yml` to:
- Configure notification channels (Slack, Email, PagerDuty)
- Set up routing rules
- Define inhibit rules

### Grafana Dashboards

Dashboards are located in `grafana/dashboards/`:
- `api-dashboard.json` - API metrics
- Add custom dashboards by creating new JSON files

## Alert Rules

### API Alerts
- **HighErrorRate**: Triggered when error rate > 5% for 5 minutes
- **CriticalErrorRate**: Triggered when error rate > 10% for 2 minutes
- **SlowApiResponses**: Triggered when p95 response time > 1000ms for 5 minutes
- **VerySlowApiResponses**: Triggered when p95 response time > 5000ms for 2 minutes

### System Alerts
- **HighMemoryUsage**: Triggered when memory usage > 85% for 5 minutes
- **CriticalMemoryUsage**: Triggered when memory usage > 95% for 2 minutes
- **HighCpuUsage**: Triggered when CPU usage > 80% for 5 minutes

### Database Alerts
- **DatabaseConnectionFailed**: Triggered when database is unreachable
- **TooManyDatabaseConnections**: Triggered when connections > 80 for 5 minutes

### Business Alerts
- **NoActiveUsers**: Triggered when no users active for 30 minutes
- **ManyUnresolvedErrors**: Triggered when unresolved errors > 100 for 10 minutes
- **AllAgentsOffline**: Triggered when no agents connected for 15 minutes

### Availability Alerts
- **ServiceDown**: Triggered when service is unreachable for 1 minute
- **ServiceRestarted**: Info alert when service restarts

## Metrics Exposed by RemoteDevAI

### HTTP Metrics
- `http_requests_total` - Total number of HTTP requests
- `http_request_duration_ms` - HTTP request duration histogram
- `http_errors_total` - Total number of HTTP errors
- `http_request_size_bytes` - HTTP request size
- `http_response_size_bytes` - HTTP response size

### System Metrics
- `process_cpu_usage_percent` - Process CPU usage
- `process_memory_usage_bytes` - Process memory usage
- `nodejs_heap_size_total_bytes` - Total heap size
- `nodejs_heap_size_used_bytes` - Used heap size

### Application Metrics
- `active_connections` - Number of active connections
- `active_sessions` - Number of active sessions
- `active_agents` - Number of active agents
- `database_connections` - Number of database connections

### Business Metrics
- `total_users` - Total number of users
- `active_users` - Number of active users (last 7 days)
- `total_projects` - Total number of projects
- `total_sessions` - Total number of sessions
- `unresolved_errors` - Number of unresolved errors

## Accessing Metrics

### Prometheus Metrics Endpoint
```bash
curl http://localhost:3000/metrics
```

### Analytics API Endpoints
```bash
# Overview
curl http://localhost:3000/api/analytics/overview

# User metrics
curl http://localhost:3000/api/analytics/users

# Usage metrics
curl http://localhost:3000/api/analytics/usage

# Error metrics
curl http://localhost:3000/api/analytics/errors

# Revenue metrics (admin only)
curl http://localhost:3000/api/analytics/revenue
```

## Health Checks

### Basic Health Check
```bash
curl http://localhost:3000/health
```

### Liveness Probe (Kubernetes)
```bash
curl http://localhost:3000/health/live
```

### Readiness Probe (Kubernetes)
```bash
curl http://localhost:3000/health/ready
```

### Detailed Health Check
```bash
curl http://localhost:3000/health/detailed
```

## Grafana Setup

1. Access Grafana at http://localhost:3001
2. Login with default credentials (admin/admin)
3. Change password when prompted
4. Navigate to Dashboards > Browse
5. View pre-configured dashboards

### Creating Custom Dashboards

1. Click "+" > Dashboard
2. Add panels with Prometheus queries
3. Save dashboard
4. Export JSON and save to `grafana/dashboards/`

## Troubleshooting

### Prometheus Not Scraping Metrics

1. Check if RemoteDevAI Cloud API is running
2. Verify `/metrics` endpoint is accessible
3. Check Prometheus logs: `docker-compose logs prometheus`
4. Verify scrape config in `prometheus/prometheus.yml`

### Grafana Not Showing Data

1. Check Prometheus datasource connection
2. Verify metrics are being collected by Prometheus
3. Check dashboard queries for errors
4. Verify time range in dashboard

### Alerts Not Firing

1. Check AlertManager logs: `docker-compose logs alertmanager`
2. Verify alert rules in `prometheus/alert_rules.yml`
3. Check Prometheus > Alerts page
4. Verify notification channels in `alertmanager/alertmanager.yml`

## Production Recommendations

### Security
- [ ] Change default Grafana admin password
- [ ] Enable authentication for Prometheus and AlertManager
- [ ] Use HTTPS for all services
- [ ] Restrict network access with firewall rules
- [ ] Use secrets management for sensitive credentials

### Performance
- [ ] Configure Prometheus retention (default: 15 days)
- [ ] Set up remote storage for long-term metrics
- [ ] Enable Prometheus federation for multi-instance setups
- [ ] Optimize scrape intervals based on needs

### Reliability
- [ ] Set up Prometheus high availability
- [ ] Configure AlertManager clustering
- [ ] Enable persistent volumes for data
- [ ] Set up regular backups
- [ ] Configure health checks

### Notifications
- [ ] Configure Slack webhook URLs
- [ ] Set up PagerDuty service keys
- [ ] Configure SMTP for email alerts
- [ ] Test all notification channels
- [ ] Set up on-call rotations

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)
