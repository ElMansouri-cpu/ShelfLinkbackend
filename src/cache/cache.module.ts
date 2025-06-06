import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { AppConfigService } from '../config/config.service';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => {
        return {
          store: redisStore as any,
          host: configService.redisHost,
          port: configService.redisPort,
          password: configService.redisPassword,
          db: configService.redisDb,
          ttl: 300, // 5 minutes default TTL
          max: 100, // Maximum number of items in cache
        };
      },
    }),
  ],
  providers: [CacheService, CacheInterceptor],
  exports: [CacheService, CacheInterceptor],
})
export class AppCacheModule {} 