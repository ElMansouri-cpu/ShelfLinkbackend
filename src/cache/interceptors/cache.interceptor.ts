import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHEABLE_METADATA, CacheableOptions } from '../decorators/cacheable.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    
    this.logger.debug(`Cache interceptor called for ${className}.${methodName}`);
    
    const cacheMetadata = this.reflector.get<CacheableOptions & { 
      methodName: string; 
      className: string; 
    }>(
      CACHEABLE_METADATA,
      handler,
    );

    this.logger.debug(`Cache metadata found: ${cacheMetadata ? 'YES' : 'NO'} for ${className}.${methodName}`);

    if (!cacheMetadata) {
      this.logger.debug(`No cache metadata for ${className}.${methodName}, skipping cache`);
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const args = context.getArgs();

    // Check conditions
    if (cacheMetadata.condition && !cacheMetadata.condition(...args)) {
      this.logger.debug(`Cache condition not met for ${cacheMetadata.className}.${cacheMetadata.methodName}`);
      return next.handle();
    }

    if (cacheMetadata.unless && cacheMetadata.unless(...args)) {
      this.logger.debug(`Cache unless condition met for ${cacheMetadata.className}.${cacheMetadata.methodName}`);
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(cacheMetadata, args, request);
    
    this.logger.debug(`Generated cache key: ${cacheKey}`);
    
    try {
      // Try to get from cache
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult !== undefined) {
        this.logger.debug(`Cache HIT for key: ${cacheKey}`);
        this.trackCacheHit(cacheMetadata, cacheKey);
        return of(cachedResult);
      }

      this.logger.debug(`Cache MISS for key: ${cacheKey}`);
      this.trackCacheMiss(cacheMetadata, cacheKey);

      // Execute method and cache result
      return next.handle().pipe(
        tap(async (result) => {
          try {
            await this.cacheService.set(cacheKey, result, { ttl: cacheMetadata.ttl });
            this.logger.debug(`Cached result for key: ${cacheKey}, TTL: ${cacheMetadata.ttl}s`);
          } catch (error) {
            this.logger.error(`Failed to cache result for key: ${cacheKey}`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache operation failed for key: ${cacheKey}`, error);
      return next.handle();
    }
  }

  private generateCacheKey(
    metadata: CacheableOptions & { methodName: string; className: string },
    args: any[],
    request?: any,
  ): string {
    // Use custom key if provided
    if (metadata.key) {
      return metadata.key;
    }

    // Use custom key generator if provided
    if (metadata.keyGenerator) {
      return metadata.keyGenerator(...args);
    }

    // Default key generation
    const methodKey = `${metadata.className}:${metadata.methodName}`;
    const argsKey = args.length > 0 ? `:${this.hashArgs(args)}` : '';
    const userContext = this.extractUserContext(request);
    
    return `${methodKey}${userContext}${argsKey}`;
  }

  private extractUserContext(request?: any): string {
    if (!request?.user?.id) {
      return '';
    }
    return `:user:${request.user.id}`;
  }

  private hashArgs(args: any[]): string {
    try {
      // Filter out complex objects and keep only serializable data
      const serializableArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          // For objects, try to extract ID or key properties
          if (arg.id) return arg.id;
          if (arg.key) return arg.key;
          if (arg.name) return arg.name;
          // For simple objects, stringify
          return JSON.stringify(arg);
        }
        return arg;
      });

      const argsString = JSON.stringify(serializableArgs);
      return this.simpleHash(argsString);
    } catch (error) {
      this.logger.warn('Failed to hash arguments, using fallback', error);
      return 'fallback';
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private trackCacheHit(metadata: any, cacheKey: string): void {
    // TODO: Implement cache hit tracking for monitoring
    // This could send metrics to a monitoring service
  }

  private trackCacheMiss(metadata: any, cacheKey: string): void {
    // TODO: Implement cache miss tracking for monitoring
    // This could send metrics to a monitoring service
  }
} 