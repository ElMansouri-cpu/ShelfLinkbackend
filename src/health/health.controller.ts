import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('database')
  async getDatabaseHealth() {
    return this.healthService.checkDatabase();
  }

  @Get('elasticsearch')
  async getElasticsearchHealth() {
    return this.healthService.checkElasticsearch();
  }

  @Get('redis')
  async getRedisHealth() {
    return this.healthService.checkRedis();
  }
} 