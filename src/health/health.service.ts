import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { AppConfigService } from '../config/config.service';
import { CacheService } from '../cache/cache.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: ComponentHealth;
    elasticsearch: ComponentHealth;
    redis: ComponentHealth;
  };
  performance?: {
    cache: CachePerformanceHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: any;
}

export interface CachePerformanceHealth {
  hitRate: number;
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  totalOperations: number;
  errors: number;
  recommendations: string[];
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: AppConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async checkHealth(includePerformance = false): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const [database, elasticsearch, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkElasticsearch(),
      this.checkRedis(),
    ]);

    const databaseHealth = database.status === 'fulfilled' ? database.value : { status: 'unhealthy' as const, message: 'Check failed' };
    const elasticsearchHealth = elasticsearch.status === 'fulfilled' ? elasticsearch.value : { status: 'unhealthy' as const, message: 'Check failed' };
    const redisHealth = redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy' as const, message: 'Check failed' };

    const allHealthy = databaseHealth.status === 'healthy' && elasticsearchHealth.status === 'healthy' && redisHealth.status === 'healthy';
    const someUnhealthy = databaseHealth.status === 'unhealthy' || elasticsearchHealth.status === 'unhealthy' || redisHealth.status === 'unhealthy';

    const healthStatus: HealthStatus = {
      status: allHealthy ? 'healthy' : someUnhealthy ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      environment: this.configService.nodeEnv,
      checks: {
        database: databaseHealth,
        elasticsearch: elasticsearchHealth,
        redis: redisHealth,
      },
    };

    // Include performance metrics if requested
    if (includePerformance) {
      healthStatus.performance = {
        cache: await this.getCachePerformanceHealth(),
      };
    }

    return healthStatus;
  }

  async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Database connection not initialized',
        };
      }

      // Simple query to check database connectivity
      await this.dataSource.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Database connection is healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkElasticsearch(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      await this.elasticsearchService.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Elasticsearch connection is healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Elasticsearch connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test Redis connectivity by setting and getting a test value
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();
      
      await this.cacheService.set(testKey, testValue, { ttl: 5 }); // 5 second TTL
      const retrievedValue = await this.cacheService.get(testKey);
      
      // Strict comparison - this WILL catch the issue if Redis is not working
      if (retrievedValue === undefined || retrievedValue !== testValue) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          message: `Redis is not responding correctly. Retrieved: ${retrievedValue}, Expected: ${testValue}`,
        };
      }
      
      // Clean up test key
      await this.cacheService.del(testKey);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Redis connection is healthy',
        details: {
          host: this.configService.redisHost,
          port: this.configService.redisPort,
          db: this.configService.redisDb,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Redis connection failed - Redis server may not be running',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cache performance health metrics
   */
  private async getCachePerformanceHealth(): Promise<CachePerformanceHealth> {
    try {
      const metrics = this.cacheService.getMetrics();
      const { hitRate, hits, misses, errors } = metrics;
      const totalOperations = hits + misses;
      
      // Determine efficiency level
      let efficiency: 'excellent' | 'good' | 'fair' | 'poor';
      const recommendations: string[] = [];

      if (hitRate >= 80) {
        efficiency = 'excellent';
      } else if (hitRate >= 60) {
        efficiency = 'good';
        recommendations.push('Consider increasing TTL for frequently accessed data');
      } else if (hitRate >= 40) {
        efficiency = 'fair';
        recommendations.push('Review caching strategy for better hit rates');
        recommendations.push('Consider cache warming for common queries');
      } else {
        efficiency = 'poor';
        recommendations.push('Urgent: Review and optimize caching strategy');
        recommendations.push('Consider implementing cache warming');
      }

      // Add error-related recommendations
      if (errors > 0 && totalOperations > 0) {
        const errorRate = (errors / totalOperations) * 100;
        if (errorRate > 5) {
          recommendations.push('High error rate - investigate Redis connectivity');
        }
      }

      return {
        hitRate,
        efficiency,
        totalOperations,
        errors,
        recommendations,
      };
    } catch (error) {
      return {
        hitRate: 0,
        efficiency: 'poor',
        totalOperations: 0,
        errors: 1,
        recommendations: ['Cache performance check failed'],
      };
    }
  }

  /**
   * Get detailed cache metrics
   */
  async getCacheMetrics() {
    return this.cacheService.getMetrics();
  }

  /**
   * Get comprehensive system health with performance data
   */
  async getDetailedHealth(): Promise<HealthStatus> {
    return this.checkHealth(true);
  }
} 