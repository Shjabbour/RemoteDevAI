/**
 * MetricsService - Prometheus metrics collection
 *
 * This service provides methods to track and expose metrics for Prometheus monitoring.
 * Metrics include counters, gauges, histograms for API requests, errors, and system resources.
 */

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  value: number;
  labels?: Record<string, string>;
}

interface Histogram {
  buckets: Map<number, number>;
  sum: number;
  count: number;
}

class MetricsService {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private labels: Map<string, Record<string, string>> = new Map();
  private help: Map<string, string> = new Map();

  // Default histogram buckets for latency (in milliseconds)
  private defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  constructor() {
    // Initialize default metrics
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics() {
    // HTTP Metrics
    this.help.set('http_requests_total', 'Total number of HTTP requests');
    this.help.set('http_request_duration_ms', 'HTTP request duration in milliseconds');
    this.help.set('http_request_size_bytes', 'HTTP request size in bytes');
    this.help.set('http_response_size_bytes', 'HTTP response size in bytes');
    this.help.set('http_errors_total', 'Total number of HTTP errors');

    // System Metrics
    this.help.set('process_cpu_usage_percent', 'Process CPU usage percentage');
    this.help.set('process_memory_usage_bytes', 'Process memory usage in bytes');
    this.help.set('nodejs_heap_size_total_bytes', 'Total heap size in bytes');
    this.help.set('nodejs_heap_size_used_bytes', 'Used heap size in bytes');

    // Application Metrics
    this.help.set('active_connections', 'Number of active connections');
    this.help.set('active_sessions', 'Number of active sessions');
    this.help.set('active_agents', 'Number of active agents');
    this.help.set('database_connections', 'Number of database connections');

    // Business Metrics
    this.help.set('total_users', 'Total number of users');
    this.help.set('active_users', 'Number of active users');
    this.help.set('total_projects', 'Total number of projects');
    this.help.set('total_sessions', 'Total number of sessions');

    // Initialize histograms
    this.histograms.set('http_request_duration_ms', {
      buckets: new Map(this.defaultBuckets.map(b => [b, 0])),
      sum: 0,
      count: 0,
    });
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    if (labels) {
      this.labels.set(key, labels);
    }
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);

    if (labels) {
      this.labels.set(key, labels);
    }
  }

  /**
   * Increment a gauge metric
   */
  incrementGauge(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    const current = this.gauges.get(key) || 0;
    this.gauges.set(key, current + value);

    if (labels) {
      this.labels.set(key, labels);
    }
  }

  /**
   * Decrement a gauge metric
   */
  decrementGauge(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    const current = this.gauges.get(key) || 0;
    this.gauges.set(key, Math.max(0, current - value));

    if (labels) {
      this.labels.set(key, labels);
    }
  }

  /**
   * Observe a histogram metric
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        buckets: new Map(this.defaultBuckets.map(b => [b, 0])),
        sum: 0,
        count: 0,
      };
      this.histograms.set(key, histogram);
    }

    // Update sum and count
    histogram.sum += value;
    histogram.count += 1;

    // Update buckets
    for (const [bucket, count] of histogram.buckets) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, count + 1);
      }
    }

    if (labels) {
      this.labels.set(key, labels);
    }
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestSize: number,
    responseSize: number
  ) {
    const labels = { method, path, status: statusCode.toString() };

    this.incrementCounter('http_requests_total', 1, labels);
    this.observeHistogram('http_request_duration_ms', duration, labels);

    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', 1, labels);
    }
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();

    // CPU usage (percentage)
    const cpuPercent = (usage.user + usage.system) / 1000000; // Convert to seconds
    this.setGauge('process_cpu_usage_percent', cpuPercent);

    // Memory usage
    this.setGauge('process_memory_usage_bytes', memory.rss);
    this.setGauge('nodejs_heap_size_total_bytes', memory.heapTotal);
    this.setGauge('nodejs_heap_size_used_bytes', memory.heapUsed);
  }

  /**
   * Get metric key with labels
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  /**
   * Parse metric key back to name and labels
   */
  private parseMetricKey(key: string): { name: string; labels?: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) {
      return { name: key };
    }

    const [, name, labelStr] = match;
    if (!labelStr) {
      return { name };
    }

    const labels: Record<string, string> = {};
    const labelPairs = labelStr.split(',');
    for (const pair of labelPairs) {
      const [k, v] = pair.split('=');
      labels[k] = v.replace(/^"|"$/g, '');
    }

    return { name, labels };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Export counters
    const counterNames = new Set<string>();
    for (const key of this.counters.keys()) {
      const { name } = this.parseMetricKey(key);
      counterNames.add(name);
    }

    for (const name of counterNames) {
      const help = this.help.get(name) || `Counter metric ${name}`;
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} counter`);

      for (const [key, value] of this.counters) {
        const { name: metricName, labels } = this.parseMetricKey(key);
        if (metricName === name) {
          const labelStr = labels
            ? '{' +
              Object.entries(labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',') +
              '}'
            : '';
          lines.push(`${name}${labelStr} ${value}`);
        }
      }
      lines.push('');
    }

    // Export gauges
    const gaugeNames = new Set<string>();
    for (const key of this.gauges.keys()) {
      const { name } = this.parseMetricKey(key);
      gaugeNames.add(name);
    }

    for (const name of gaugeNames) {
      const help = this.help.get(name) || `Gauge metric ${name}`;
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} gauge`);

      for (const [key, value] of this.gauges) {
        const { name: metricName, labels } = this.parseMetricKey(key);
        if (metricName === name) {
          const labelStr = labels
            ? '{' +
              Object.entries(labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',') +
              '}'
            : '';
          lines.push(`${name}${labelStr} ${value}`);
        }
      }
      lines.push('');
    }

    // Export histograms
    const histogramNames = new Set<string>();
    for (const key of this.histograms.keys()) {
      const { name } = this.parseMetricKey(key);
      histogramNames.add(name);
    }

    for (const name of histogramNames) {
      const help = this.help.get(name) || `Histogram metric ${name}`;
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} histogram`);

      for (const [key, histogram] of this.histograms) {
        const { name: metricName, labels } = this.parseMetricKey(key);
        if (metricName === name) {
          const labelStr = labels
            ? Object.entries(labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',')
            : '';
          const labelPrefix = labelStr ? `{${labelStr}` : '{';

          // Export buckets
          for (const [bucket, count] of histogram.buckets) {
            lines.push(`${name}_bucket${labelPrefix},le="${bucket}"} ${count}`);
          }
          lines.push(`${name}_bucket${labelPrefix},le="+Inf"} ${histogram.count}`);

          // Export sum and count
          lines.push(`${name}_sum${labelStr ? '{' + labelStr + '}' : ''} ${histogram.sum}`);
          lines.push(`${name}_count${labelStr ? '{' + labelStr + '}' : ''} ${histogram.count}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.labels.clear();
    this.initializeDefaultMetrics();
  }

  /**
   * Get all metrics as JSON (for debugging)
   */
  toJSON() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, hist]) => [
          key,
          {
            buckets: Object.fromEntries(hist.buckets),
            sum: hist.sum,
            count: hist.count,
          },
        ])
      ),
    };
  }
}

export default new MetricsService();
