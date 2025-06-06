import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-store';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from '../config/config.service';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheEvictInterceptor } from './interceptors/cache-evict.interceptor';
import { CacheMonitorService } from './monitoring/cache-monitor.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: AppConfigService) => {
        return {
          store: redisStore,
          host: configService.redisHost,
          port: configService.redisPort,
          password: configService.redisPassword,
          db: configService.redisDb,
          ttl: 300, // Default TTL: 5 minutes
          max: 1000, // Maximum number of items in cache
        };
      },
      inject: [AppConfigService],
    }),
    ScheduleModule.forRoot(), // Enable scheduled tasks for monitoring
  ],
  controllers: [CacheController],
  providers: [
    CacheService,
    CacheInterceptor,
    CacheEvictInterceptor,
    CacheMonitorService,
  ],
  exports: [
    CacheService,
    CacheInterceptor,
    CacheEvictInterceptor,
    CacheMonitorService,
  ],
})
export class AppCacheModule {} 