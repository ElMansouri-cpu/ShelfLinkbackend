import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService<AppConfig>) {}

  // Application Configuration
  get port(): number {
    return this.configService.get('port', { infer: true })!;
  }

  get nodeEnv(): string {
    return this.configService.get('nodeEnv', { infer: true })!;
  }

  get frontendUrl(): string {
    return this.configService.get('frontendUrl', { infer: true })!;
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // Database Configuration
  get databaseUrl(): string {
    return this.configService.get('databaseUrl', { infer: true })!;
  }

  // Supabase Configuration
  get supabaseUrl(): string {
    return this.configService.get('supabaseUrl', { infer: true })!;
  }

  get supabaseKey(): string {
    return this.configService.get('supabaseKey', { infer: true })!;
  }

  get supabaseJwtSecret(): string {
    return this.configService.get('supabaseJwtSecret', { infer: true })!;
  }

  // JWT Configuration
  get jwtSecret(): string {
    return this.configService.get('jwtSecret', { infer: true })!;
  }

  get jwtExpiresIn(): string {
    return this.configService.get('jwtExpiresIn', { infer: true })!;
  }

  // Elasticsearch Configuration
  get elasticsearchNode(): string {
    return this.configService.get('elasticsearchNode', { infer: true })!;
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get('redisHost', { infer: true })!;
  }

  get redisPort(): number {
    return this.configService.get('redisPort', { infer: true })!;
  }

  get redisPassword(): string | undefined {
    return this.configService.get('redisPassword', { infer: true });
  }

  get redisDb(): number {
    return this.configService.get('redisDb', { infer: true })!;
  }

  get redisUrl(): string {
    const auth = this.redisPassword ? `:${this.redisPassword}@` : '';
    return `redis://${auth}${this.redisHost}:${this.redisPort}/${this.redisDb}`;
  }
} 