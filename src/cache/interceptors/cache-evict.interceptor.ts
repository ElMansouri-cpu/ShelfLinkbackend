import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHE_EVICT_METADATA, CacheEvictOptions } from '../decorators/cache-evict.decorator';

@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const evictMetadata = this.reflector.get<CacheEvictOptions & { 
      methodName: string; 
      className: string; 
    }>(
      CACHE_EVICT_METADATA,
      context.getHandler(),
    );

    if (!evictMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const args = context.getArgs();

    // Check conditions
    if (evictMetadata.condition && !evictMetadata.condition(...args)) {
      this.logger.debug(`Cache eviction condition not met for ${evictMetadata.className}.${evictMetadata.methodName}`);
      return next.handle();
    }

    // Evict before method execution if configured
    if (evictMetadata.beforeInvocation) {
      await this.performEviction(evictMetadata, args, request);
    }

    return next.handle().pipe(
      tap(async () => {
        // Evict after method execution (default behavior)
        if (!evictMetadata.beforeInvocation) {
          await this.performEviction(evictMetadata, args, request);
        }
      }),
    );
  }

  private async performEviction(
    metadata: CacheEvictOptions & { methodName: string; className: string },
    args: any[],
    request?: any,
  ): Promise<void> {
    try {
      if (metadata.allEntries) {
        this.logger.warn(`Clearing ALL cache entries from ${metadata.className}.${metadata.methodName}`);
        await this.cacheService.reset();
        return;
      }

      // Generate keys/patterns to evict
      const keysToEvict = this.generateEvictionTargets(metadata, args, request);
      
      for (const target of keysToEvict) {
        if (target.isPattern) {
          this.logger.debug(`Evicting cache pattern: ${target.value}`);
          await this.cacheService.invalidatePattern(target.value);
        } else {
          this.logger.debug(`Evicting cache key: ${target.value}`);
          await this.cacheService.del(target.value);
        }
      }

      this.trackCacheEviction(metadata, keysToEvict);
    } catch (error) {
      this.logger.error(`Cache eviction failed for ${metadata.className}.${metadata.methodName}`, error);
    }
  }

  private generateEvictionTargets(
    metadata: CacheEvictOptions & { methodName: string; className: string },
    args: any[],
    request?: any,
  ): Array<{ value: string; isPattern: boolean }> {
    const targets: Array<{ value: string; isPattern: boolean }> = [];

    // Handle specific key eviction
    if (metadata.key) {
      targets.push({ value: metadata.key, isPattern: false });
    }

    // Handle pattern eviction
    if (metadata.pattern) {
      targets.push({ value: metadata.pattern, isPattern: true });
    }

    // Handle dynamic key generation
    if (metadata.keyGenerator) {
      const key = metadata.keyGenerator(...args);
      targets.push({ value: key, isPattern: false });
    }

    // Handle dynamic pattern generation
    if (metadata.patternGenerator) {
      const pattern = metadata.patternGenerator(...args);
      targets.push({ value: pattern, isPattern: true });
    }

    // Default eviction based on method and class
    if (targets.length === 0) {
      const defaultPattern = `${metadata.className}:${metadata.methodName}:*`;
      targets.push({ value: defaultPattern, isPattern: true });
    }

    return targets;
  }

  private trackCacheEviction(
    metadata: any, 
    targets: Array<{ value: string; isPattern: boolean }>
  ): void {
    // TODO: Implement cache eviction tracking for monitoring
    // This could send metrics to a monitoring service
    this.logger.debug(`Cache eviction completed for ${metadata.className}.${metadata.methodName}`, {
      targets: targets.map(t => ({ target: t.value, isPattern: t.isPattern })),
    });
  }
} 