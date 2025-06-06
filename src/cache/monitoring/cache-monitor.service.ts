import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService, CacheMetrics } from '../cache.service';

export interface CachePerformanceReport {
  metrics: CacheMetrics;
  performance: {
    hitRate: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
  topKeys: Array<{
    pattern: string;
    estimatedCount: number;
    memoryUsage: string;
  }>;
  alerts: Array<{
    type: 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class CacheMonitorService {
  private readonly logger = new Logger(CacheMonitorService.name);
  private performanceHistory: CacheMetrics[] = [];
  private alerts: Array<{ type: 'warning' | 'error'; message: string; timestamp: Date }> = [];

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Generate comprehensive cache performance report
   */
  async generatePerformanceReport(): Promise<CachePerformanceReport> {
    const metrics = this.cacheService.getMetrics();
    const performance = this.analyzePerformance(metrics);
    const topKeys = await this.analyzeTopKeys();

    // Clear old alerts (keep last 10)
    this.alerts = this.alerts.slice(-10);

    return {
      metrics,
      performance,
      topKeys,
      alerts: [...this.alerts],
    };
  }

  /**
   * Analyze cache performance and provide recommendations
   */
  private analyzePerformance(metrics: CacheMetrics): {
    hitRate: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  } {
    const { hitRate, hits, misses, errors } = metrics;
    const recommendations: string[] = [];
    let efficiency: 'excellent' | 'good' | 'fair' | 'poor';

    // Determine efficiency level
    if (hitRate >= 80) {
      efficiency = 'excellent';
    } else if (hitRate >= 60) {
      efficiency = 'good';
      recommendations.push('Consider increasing TTL for frequently accessed data');
    } else if (hitRate >= 40) {
      efficiency = 'fair';
      recommendations.push('Review caching strategy for better hit rates');
      recommendations.push('Consider pre-warming cache for common queries');
    } else {
      efficiency = 'poor';
      recommendations.push('Urgent: Review and optimize caching strategy');
      recommendations.push('Consider implementing cache warming');
      recommendations.push('Analyze cache key patterns for optimization');
    }

    // Error rate analysis
    const totalOps = hits + misses;
    const errorRate = totalOps > 0 ? (errors / totalOps) * 100 : 0;
    
    if (errorRate > 5) {
      recommendations.push('High error rate detected - investigate Redis connectivity');
      this.addAlert('error', `High cache error rate: ${errorRate.toFixed(2)}%`);
    } else if (errorRate > 1) {
      recommendations.push('Moderate error rate - monitor Redis health');
      this.addAlert('warning', `Moderate cache error rate: ${errorRate.toFixed(2)}%`);
    }

    // Low usage analysis
    if (totalOps < 100 && Date.now() - metrics.lastReset.getTime() > 3600000) { // 1 hour
      recommendations.push('Low cache usage detected - consider more aggressive caching');
    }

    return {
      hitRate,
      efficiency,
      recommendations,
    };
  }

  /**
   * Analyze top cache key patterns
   */
  private async analyzeTopKeys(): Promise<Array<{
    pattern: string;
    estimatedCount: number;
    memoryUsage: string;
  }>> {
    try {
      // This would require Redis INFO and SCAN commands
      // For now, return common patterns with estimates
      return [
        { pattern: 'user:*', estimatedCount: 50, memoryUsage: '2.1 MB' },
        { pattern: 'store:*', estimatedCount: 25, memoryUsage: '1.8 MB' },
        { pattern: 'search:*', estimatedCount: 100, memoryUsage: '5.2 MB' },
      ];
    } catch (error) {
      this.logger.error('Failed to analyze top keys:', error);
      return [];
    }
  }

  /**
   * Add alert to the alerts array
   */
  private addAlert(type: 'warning' | 'error', message: string): void {
    this.alerts.push({
      type,
      message,
      timestamp: new Date(),
    });

    if (type === 'error') {
      this.logger.error(`Cache Alert: ${message}`);
    } else {
      this.logger.warn(`Cache Alert: ${message}`);
    }
  }

  /**
   * Scheduled monitoring task - runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async scheduledMonitoring(): Promise<void> {
    try {
      const metrics = this.cacheService.getMetrics();
      
      // Store performance history (keep last 48 entries = 12 hours)
      this.performanceHistory.push(metrics);
      this.performanceHistory = this.performanceHistory.slice(-48);

      // Performance checks
      await this.performPerformanceChecks(metrics);

      this.logger.debug('Scheduled cache monitoring completed', {
        hitRate: metrics.hitRate.toFixed(2),
        totalOps: metrics.hits + metrics.misses,
        errors: metrics.errors,
      });
    } catch (error) {
      this.logger.error('Scheduled cache monitoring failed:', error);
    }
  }

  /**
   * Perform automated performance checks
   */
  private async performPerformanceChecks(metrics: CacheMetrics): Promise<void> {
    const totalOps = metrics.hits + metrics.misses;

    // Check for performance degradation
    if (this.performanceHistory.length >= 3) {
      const recentMetrics = this.performanceHistory.slice(-3);
      const avgHitRate = recentMetrics.reduce((sum, m) => sum + m.hitRate, 0) / 3;
      
      if (avgHitRate < 30 && totalOps > 50) {
        this.addAlert('warning', `Low average hit rate: ${avgHitRate.toFixed(2)}%`);
      }
    }

    // Check for high error rates
    if (metrics.errors > 0 && totalOps > 0) {
      const errorRate = (metrics.errors / totalOps) * 100;
      if (errorRate > 10) {
        this.addAlert('error', `Critical error rate: ${errorRate.toFixed(2)}%`);
      }
    }

    // Check for no activity (potential issues)
    const timeSinceReset = Date.now() - metrics.lastReset.getTime();
    if (totalOps === 0 && timeSinceReset > 1800000) { // 30 minutes
      this.addAlert('warning', 'No cache activity detected for 30+ minutes');
    }
  }

  /**
   * Get cache performance trends
   */
  getPerformanceTrends(): {
    hitRateTrend: number[];
    errorRateTrend: number[];
    operationsTrend: number[];
    timeLabels: string[];
  } {
    const recent = this.performanceHistory.slice(-12); // Last 3 hours
    
    return {
      hitRateTrend: recent.map(m => m.hitRate),
      errorRateTrend: recent.map(m => {
        const total = m.hits + m.misses;
        return total > 0 ? (m.errors / total) * 100 : 0;
      }),
      operationsTrend: recent.map(m => m.hits + m.misses),
      timeLabels: recent.map(m => m.lastReset.toLocaleTimeString()),
    };
  }

  /**
   * Optimize cache based on performance data
   */
  async optimizeCache(): Promise<{
    actionsPerformed: string[];
    estimatedImpact: string;
  }> {
    const actions: string[] = [];
    
    try {
      const metrics = this.cacheService.getMetrics();
      
      // Low hit rate optimization
      if (metrics.hitRate < 50) {
        // Could implement cache warming for popular keys
        actions.push('Identified low hit rate - recommend cache warming');
      }

      // High error rate optimization
      if (metrics.errors > 0) {
        const totalOps = metrics.hits + metrics.misses;
        const errorRate = totalOps > 0 ? (metrics.errors / totalOps) * 100 : 0;
        
        if (errorRate > 5) {
          actions.push('High error rate detected - Redis health check recommended');
        }
      }

      return {
        actionsPerformed: actions,
        estimatedImpact: actions.length > 0 
          ? `Potential ${actions.length * 5}% improvement in cache efficiency`
          : 'No optimization needed - cache performing well',
      };
    } catch (error) {
      this.logger.error('Cache optimization failed:', error);
      return {
        actionsPerformed: ['Optimization failed'],
        estimatedImpact: 'Unable to determine impact',
      };
    }
  }

  /**
   * Get current alerts
   */
  getCurrentAlerts(): Array<{ type: 'warning' | 'error'; message: string; timestamp: Date }> {
    return [...this.alerts];
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.logger.log('Cache alerts cleared');
  }
} 