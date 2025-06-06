import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  uptime: number;
}

export interface RequestMetric {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
  storeId?: string;
}

export interface ErrorMetric {
  id: string;
  error: string;
  stack?: string;
  path: string;
  method: string;
  timestamp: Date;
  userId?: string;
  storeId?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly requestMetrics: RequestMetric[] = [];
  private readonly errorMetrics: ErrorMetric[] = [];
  private readonly maxMetricsSize = 1000; // Keep last 1000 metrics

  constructor(private readonly configService: AppConfigService) {}

  /**
   * Record request metrics
   */
  recordRequest(metric: Omit<RequestMetric, 'id' | 'timestamp'>): void {
    const requestMetric: RequestMetric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.requestMetrics.push(requestMetric);

    // Keep only the latest metrics
    if (this.requestMetrics.length > this.maxMetricsSize) {
      this.requestMetrics.splice(0, this.requestMetrics.length - this.maxMetricsSize);
    }

    // Log slow requests
    if (requestMetric.responseTime > 1000) {
      this.logger.warn(
        `Slow request detected: ${requestMetric.method} ${requestMetric.path} - ${requestMetric.responseTime}ms`,
        {
          requestId: requestMetric.id,
          method: requestMetric.method,
          path: requestMetric.path,
          responseTime: requestMetric.responseTime,
          statusCode: requestMetric.statusCode,
        },
      );
    }
  }

  /**
   * Record error metrics
   */
  recordError(metric: Omit<ErrorMetric, 'id' | 'timestamp'>): void {
    const errorMetric: ErrorMetric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.errorMetrics.push(errorMetric);

    // Keep only the latest error metrics
    if (this.errorMetrics.length > this.maxMetricsSize) {
      this.errorMetrics.splice(0, this.errorMetrics.length - this.maxMetricsSize);
    }

    this.logger.error(
      `Error recorded: ${errorMetric.method} ${errorMetric.path} - ${errorMetric.error}`,
      {
        errorId: errorMetric.id,
        error: errorMetric.error,
        stack: errorMetric.stack,
        path: errorMetric.path,
        method: errorMetric.method,
      },
    );
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000; // Last minute

    // Filter requests from last minute
    const recentRequests = this.requestMetrics.filter(
      (metric) => metric.timestamp.getTime() > oneMinuteAgo,
    );

    // Calculate metrics
    const requestCount = recentRequests.length;
    const averageResponseTime = requestCount > 0
      ? recentRequests.reduce((sum, metric) => sum + metric.responseTime, 0) / requestCount
      : 0;

    const errorCount = recentRequests.filter(
      (metric) => metric.statusCode >= 400,
    ).length;
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;

    return {
      requestCount,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      activeConnections: 0, // Would need to implement connection tracking
      memoryUsage: process.memoryUsage(),
      cpuUsage: this.getCpuUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Get request metrics for a specific time period
   */
  getRequestMetrics(
    startTime?: Date,
    endTime?: Date,
    userId?: string,
    storeId?: string,
  ): RequestMetric[] {
    let filteredMetrics = [...this.requestMetrics];

    if (startTime) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.timestamp >= startTime,
      );
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.timestamp <= endTime,
      );
    }

    if (userId) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.userId === userId,
      );
    }

    if (storeId) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.storeId === storeId,
      );
    }

    return filteredMetrics;
  }

  /**
   * Get error metrics for a specific time period
   */
  getErrorMetrics(
    startTime?: Date,
    endTime?: Date,
    userId?: string,
    storeId?: string,
  ): ErrorMetric[] {
    let filteredMetrics = [...this.errorMetrics];

    if (startTime) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.timestamp >= startTime,
      );
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.timestamp <= endTime,
      );
    }

    if (userId) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.userId === userId,
      );
    }

    if (storeId) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.storeId === storeId,
      );
    }

    return filteredMetrics;
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 10): Array<{
    path: string;
    method: string;
    averageResponseTime: number;
    requestCount: number;
  }> {
    const endpointMetrics = new Map<string, { totalTime: number; count: number }>();

    this.requestMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.path}`;
      const existing = endpointMetrics.get(key) || { totalTime: 0, count: 0 };
      endpointMetrics.set(key, {
        totalTime: existing.totalTime + metric.responseTime,
        count: existing.count + 1,
      });
    });

    return Array.from(endpointMetrics.entries())
      .map(([endpoint, stats]) => {
        const [method, path] = endpoint.split(' ', 2);
        return {
          method,
          path,
          averageResponseTime: Math.round(stats.totalTime / stats.count),
          requestCount: stats.count,
        };
      })
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }

  /**
   * Get most error-prone endpoints
   */
  getMostErrorProneEndpoints(limit: number = 10): Array<{
    path: string;
    method: string;
    errorRate: number;
    totalRequests: number;
    errorCount: number;
  }> {
    const endpointStats = new Map<string, { total: number; errors: number }>();

    this.requestMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.path}`;
      const existing = endpointStats.get(key) || { total: 0, errors: 0 };
      endpointStats.set(key, {
        total: existing.total + 1,
        errors: existing.errors + (metric.statusCode >= 400 ? 1 : 0),
      });
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => {
        const [method, path] = endpoint.split(' ', 2);
        return {
          method,
          path,
          errorRate: Math.round((stats.errors / stats.total) * 10000) / 100,
          totalRequests: stats.total,
          errorCount: stats.errors,
        };
      })
      .filter((endpoint) => endpoint.errorCount > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Clear old metrics (cleanup job)
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const requestsBefore = this.requestMetrics.length;
    const errorsBefore = this.errorMetrics.length;

    // Remove old request metrics
    const requestsToKeep = this.requestMetrics.filter(
      (metric) => metric.timestamp > cutoffTime,
    );
    this.requestMetrics.splice(0, this.requestMetrics.length, ...requestsToKeep);

    // Remove old error metrics
    const errorsToKeep = this.errorMetrics.filter(
      (metric) => metric.timestamp > cutoffTime,
    );
    this.errorMetrics.splice(0, this.errorMetrics.length, ...errorsToKeep);

    const requestsCleaned = requestsBefore - this.requestMetrics.length;
    const errorsCleaned = errorsBefore - this.errorMetrics.length;

    this.logger.log(
      `Cleaned up ${requestsCleaned} request metrics and ${errorsCleaned} error metrics older than ${olderThanHours} hours`,
    );
  }

  /**
   * Generate unique ID for metrics
   */
  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get CPU usage (simplified)
   */
  private getCpuUsage(): number {
    // This is a simplified CPU usage calculation
    // In production, you might want to use more sophisticated monitoring
    const usage = process.cpuUsage();
    return Math.round(((usage.user + usage.system) / 1000000) * 100) / 100;
  }
} 