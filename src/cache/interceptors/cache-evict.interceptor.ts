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

    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    this.logger.debug(`Cache eviction interceptor called for ${className}.${methodName}`);
    this.logger.debug(`Cache eviction metadata found: ${evictMetadata ? 'YES' : 'NO'} for ${className}.${methodName}`);

    if (!evictMetadata) {
      this.logger.debug(`No cache eviction metadata for ${className}.${methodName}, skipping eviction`);
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const args = context.getArgs();

    this.logger.debug(`Cache eviction interceptor called for ${evictMetadata.className}.${evictMetadata.methodName}`);

    // Check conditions
    if (evictMetadata.condition && !evictMetadata.condition(...args)) {
      this.logger.debug(`Cache eviction condition not met for ${evictMetadata.className}.${evictMetadata.methodName}`);
      return next.handle();
    }

    // Evict before method execution if configured
    if (evictMetadata.beforeInvocation) {
      this.logger.debug(`Evicting cache before invocation for ${evictMetadata.className}.${evictMetadata.methodName}`);
      await this.performEviction(evictMetadata, args, request);
    }

    return next.handle().pipe(
      tap(async () => {
        // Evict after method execution (default behavior)
        if (!evictMetadata.beforeInvocation) {
          this.logger.debug(`Evicting cache after invocation for ${evictMetadata.className}.${evictMetadata.methodName}`);
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
      this.logger.debug(`Starting eviction for ${metadata.className}.${metadata.methodName}`);
      
      if (metadata.allEntries) {
        this.logger.warn(`Clearing ALL cache entries from ${metadata.className}.${metadata.methodName}`);
        await this.cacheService.reset();
        return;
      }

      // Generate keys/patterns to evict
      const keysToEvict = this.generateEvictionTargets(metadata, args, request);
      
      this.logger.debug(`Generated ${keysToEvict.length} eviction targets`);
      
      // Perform primary eviction
      for (const target of keysToEvict) {
        if (target.isPattern) {
          this.logger.debug(`Evicting cache pattern: ${target.value}`);
          const deletedCount = await this.cacheService.invalidatePattern(target.value);
          this.logger.debug(`Deleted ${deletedCount} keys matching pattern: ${target.value}`);
        } else {
          this.logger.debug(`Evicting cache key: ${target.value}`);
          await this.cacheService.del(target.value);
          this.logger.debug(`Deleted key: ${target.value}`);
        }
      }

      // Perform cascade eviction if enabled
      if (metadata.cascade) {
        this.logger.debug(`Performing cascade eviction for ${metadata.className}.${metadata.methodName}`);
        await this.performCascadeEviction(metadata, args, request);
      }

      this.trackCacheEviction(metadata, keysToEvict);
      this.logger.debug(`Eviction completed for ${metadata.className}.${metadata.methodName}`);
    } catch (error) {
      this.logger.error(`Cache eviction failed for ${metadata.className}.${metadata.methodName}`, error);
    }
  }

  private async performCascadeEviction(
    metadata: CacheEvictOptions & { methodName: string; className: string },
    args: any[],
    request?: any,
  ): Promise<void> {
    try {
      // Handle predefined cascade patterns
      if (metadata.cascadePatterns && metadata.cascadePatterns.length > 0) {
        for (const pattern of metadata.cascadePatterns) {
          this.logger.debug(`Cascade evicting pattern: ${pattern}`);
          await this.cacheService.invalidatePattern(pattern);
        }
      }

      // Handle dynamic cascade patterns based on entity type
      const entityType = this.detectEntityType(metadata.className);
      if (entityType) {
        await this.evictRelatedCaches(entityType, args, request);
      }
    } catch (error) {
      this.logger.error(`Cascade eviction failed for ${metadata.className}.${metadata.methodName}`, error);
    }
  }

  private async evictRelatedCaches(entityType: string, args: any[], request?: any): Promise<void> {
    try {
      // Extract storeId from args or request
      const storeId = this.extractStoreId(args, request);
      if (!storeId) {
        this.logger.debug('No storeId found for cascade eviction');
        return;
      }

      // Evict related caches based on entity type
      const relatedPatterns = [
        `store:${storeId}:stats*`,
        `store:${storeId}:counts*`,
        `store:${storeId}:analytics*`,
        `search:${entityType}:*`,
        `store:${storeId}:${entityType}:stats*`,
        `store:${storeId}:${entityType}:counts*`,
      ];

      for (const pattern of relatedPatterns) {
        this.logger.debug(`Cascade evicting related pattern: ${pattern}`);
        await this.cacheService.invalidatePattern(pattern);
      }
    } catch (error) {
      this.logger.error('Failed to evict related caches', error);
    }
  }

  private detectEntityType(className: string): string | null {
    // Map class names to entity types
    const entityTypeMap: Record<string, string> = {
      'BrandsService': 'brands',
      'CategoriesService': 'categories',
      'ProvidersService': 'providers',
      'UsersService': 'users',
      'StoresService': 'stores',
      'OrdersService': 'orders',
      'ProductsService': 'products',
    };

    return entityTypeMap[className] || null;
  }

  private extractStoreId(args: any[], request?: any): string | null {
    // Try to extract storeId from various sources
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null) {
        if (arg.storeId) return arg.storeId;
        if (arg.store_id) return arg.store_id;
      }
    }

    // Check request params or query
    if (request) {
      if (request.params?.storeId) return request.params.storeId;
      if (request.query?.storeId) return request.query.storeId;
      if (request.body?.storeId) return request.body.storeId;
    }

    return null;
  }

  private generateEvictionTargets(
    metadata: CacheEvictOptions & { methodName: string; className: string },
    args: any[],
    request?: any,
  ): Array<{ value: string; isPattern: boolean }> {
    const targets: Array<{ value: string; isPattern: boolean }> = [];

    this.logger.debug(`Generating eviction targets for ${metadata.className}.${metadata.methodName}`);

    // Handle specific key eviction
    if (metadata.key) {
      targets.push({ value: metadata.key, isPattern: false });
      this.logger.debug(`Added specific key: ${metadata.key}`);
    }

    // Handle pattern eviction
    if (metadata.pattern) {
      targets.push({ value: metadata.pattern, isPattern: true });
      this.logger.debug(`Added pattern: ${metadata.pattern}`);
    }

    // Handle dynamic key generation
    if (metadata.keyGenerator) {
      try {
        // For controller methods, pass request as first argument
        const key = request ? metadata.keyGenerator(request, ...args) : metadata.keyGenerator(...args);
        if (key) {
          targets.push({ value: key, isPattern: false });
          this.logger.debug(`Generated key: ${key}`);
        }
      } catch (error) {
        this.logger.error('Failed to generate cache key', error);
      }
    }

    // Handle dynamic pattern generation
    if (metadata.patternGenerator) {
      try {
        // For controller methods, pass request as first argument
        const pattern = request ? metadata.patternGenerator(request, ...args) : metadata.patternGenerator(...args);
        if (pattern) {
          this.logger.debug(`Generated pattern: ${pattern}`);
          // Handle multiple patterns separated by '|'
          const patterns = pattern.split('|');
          for (const p of patterns) {
            if (p.trim()) {
              targets.push({ value: p.trim(), isPattern: true });
              this.logger.debug(`Added pattern: ${p.trim()}`);
            }
          }
        }
      } catch (error) {
        this.logger.error('Failed to generate cache pattern', error);
      }
    }

    // Default eviction based on method and class
    if (targets.length === 0) {
      const defaultPattern = `${metadata.className}:${metadata.methodName}:*`;
      targets.push({ value: defaultPattern, isPattern: true });
      this.logger.debug(`Added default pattern: ${defaultPattern}`);
    }

    this.logger.debug(`Total eviction targets: ${targets.length}`, targets);
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
      cascade: metadata.cascade,
      cascadePatterns: metadata.cascadePatterns,
    });
  }
} 