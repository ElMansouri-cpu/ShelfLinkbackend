import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { AppConfigService } from '../config/config.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: ComponentHealth;
    elasticsearch: ComponentHealth;
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
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const [database, elasticsearch] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkElasticsearch(),
    ]);

    const databaseHealth = database.status === 'fulfilled' ? database.value : { status: 'unhealthy' as const, message: 'Check failed' };
    const elasticsearchHealth = elasticsearch.status === 'fulfilled' ? elasticsearch.value : { status: 'unhealthy' as const, message: 'Check failed' };

    const allHealthy = databaseHealth.status === 'healthy' && elasticsearchHealth.status === 'healthy';
    const someUnhealthy = databaseHealth.status === 'unhealthy' || elasticsearchHealth.status === 'unhealthy';

    return {
      status: allHealthy ? 'healthy' : someUnhealthy ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      environment: this.configService.nodeEnv,
      checks: {
        database: databaseHealth,
        elasticsearch: elasticsearchHealth,
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
} 