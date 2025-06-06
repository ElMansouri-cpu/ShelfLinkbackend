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
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: any;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: AppConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
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

    return {
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
      
      if (retrievedValue !== testValue) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          message: 'Redis read/write test failed',
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
        message: 'Redis connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
} 