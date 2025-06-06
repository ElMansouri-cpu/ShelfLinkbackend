import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService, CacheKeyOptions } from '../cache.service';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

export interface CacheConfig {
  keyOptions?: CacheKeyOptions;
  ttl?: number;
  enabled?: boolean;
}

export const CacheKey = (config: CacheConfig) => 
  SetMetadata(CACHE_KEY_METADATA, config);

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheConfig = this.reflector.get<CacheConfig>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheConfig || cacheConfig.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request, cacheConfig);

    // Try to get from cache
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult !== undefined) {
      this.logger.debug(`Returning cached result for key: ${cacheKey}`);
      return of(cachedResult);
    }

    // Execute the handler and cache the result
    return next.handle().pipe(
      tap(async (response) => {
        if (response !== undefined && response !== null) {
          await this.cacheService.set(cacheKey, response, {
            ttl: cacheConfig.ttl || 300, // Default 5 minutes
          });
          this.logger.debug(`Cached result for key: ${cacheKey}`);
        }
      }),
    );
  }

  private generateCacheKey(request: any, config: CacheConfig): string {
    const keyOptions: CacheKeyOptions = {
      ...config.keyOptions,
    };

    // Extract common parameters from request
    if (request.user?.userId) {
      keyOptions.userId = request.user.userId;
    }

    if (request.params?.storeId) {
      keyOptions.storeId = request.params.storeId;
    }

    if (request.query?.q) {
      keyOptions.query = request.query.q;
    }

    // Include request path in cache key
    const path = request.route?.path || request.url;
    keyOptions.entityType = `${keyOptions.entityType || 'api'}:${path}`;

    // Include query parameters as filters
    if (request.query && Object.keys(request.query).length > 0) {
      const { q, page, limit, ...filters } = request.query;
      if (Object.keys(filters).length > 0) {
        keyOptions.filters = filters;
      }
    }

    return this.cacheService.generateKey(keyOptions);
  }
} 