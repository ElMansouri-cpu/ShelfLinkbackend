import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppConfigService } from '../config/config.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

export interface CacheKeyOptions {
  userId?: string;
  storeId?: string;
  entityType?: string;
  entityId?: string;
  query?: string;
  filters?: Record<string, any>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  lastReset: Date;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    lastReset: new Date(),
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: AppConfigService,
  ) {}

  /**
   * Generate cache key from options
   */
  generateKey(keyOptions: CacheKeyOptions): string {
    const parts: string[] = [];

    // Add base prefix
    if (keyOptions.userId) {
      parts.push(`user:${keyOptions.userId}`);
    }

    if (keyOptions.storeId) {
      parts.push(`store:${keyOptions.storeId}`);
    }

    if (keyOptions.entityType) {
      parts.push(`type:${keyOptions.entityType}`);
    }

    if (keyOptions.entityId) {
      parts.push(`id:${keyOptions.entityId}`);
    }

    if (keyOptions.query) {
      // Create a hash for complex queries
      const queryHash = this.hashString(keyOptions.query);
      parts.push(`query:${queryHash}`);
    }

    if (keyOptions.filters && Object.keys(keyOptions.filters).length > 0) {
      const filtersString = JSON.stringify(keyOptions.filters);
      const filtersHash = this.hashString(filtersString);
      parts.push(`filters:${filtersHash}`);
    }

    return parts.join(':');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== null && value !== undefined) {
        this.logger.debug(`Cache HIT for key: ${key}`);
        this.metrics.hits++;
        this.updateHitRate();
        return value;
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
        this.metrics.misses++;
        this.updateHitRate();
        return undefined;
      }
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? 300; // Default 5 minutes
      await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl}s`);
      this.metrics.sets++;
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Delete specific key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE for key: ${key}`);
      this.metrics.deletes++;
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async reset(): Promise<void> {
    try {
      // Check if reset method exists, otherwise use alternative approach
      if ('reset' in this.cacheManager && typeof this.cacheManager.reset === 'function') {
        await this.cacheManager.reset();
      } else {
        this.logger.warn('Cache reset method not available');
      }
      this.logger.warn('Cache RESET - All cache cleared');
      this.resetMetrics();
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Get or set pattern - if not in cache, execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Enhanced pattern-based cache invalidation
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      this.logger.debug(`Starting cache invalidation for pattern: ${pattern}`);
      
      // Try to get the Redis client for SCAN operations
      const redisClient = this.getRedisClient();
      
      if (!redisClient) {
        this.logger.warn(`Redis client not available for pattern invalidation: ${pattern}`);
        this.logger.debug('Attempting fallback cache invalidation...');
        return await this.fallbackPatternInvalidation(pattern);
      }

      let deletedCount = 0;
      let cursor = '0';
      let totalScanned = 0;
      
      do {
        // Use SCAN to find matching keys
        const result = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        totalScanned += keys.length;
        
        if (keys.length > 0) {
          this.logger.debug(`Found ${keys.length} keys matching pattern "${pattern}":`, keys);
          // Delete found keys
          await redisClient.del(...keys);
          deletedCount += keys.length;
          this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        }
      } while (cursor !== '0');
      
      this.logger.log(`Cache invalidation completed for pattern: ${pattern}, scanned ${totalScanned} keys, deleted ${deletedCount} keys`);
      this.metrics.deletes += deletedCount;
      
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Fallback pattern invalidation when Redis client is not available
   * This method tries to invalidate common cache patterns manually
   */
  private async fallbackPatternInvalidation(pattern: string): Promise<number> {
    try {
      this.logger.debug(`Using fallback pattern invalidation for: ${pattern}`);
      
      let deletedCount = 0;
      
      // Extract entity type from pattern
      const entityMatch = pattern.match(/search:(\w+):/);
      const entityType = entityMatch ? entityMatch[1] : null;
      
      // Extract store ID from pattern if present
      const storeMatch = pattern.match(/store=([^:]+)/);
      const storeId = storeMatch ? storeMatch[1] : null;
      
      // Common cache key patterns to try based on entity type
      const commonPatterns = [
        // Brand search patterns
        `search:brands:store=*:*`,
        `search:brands:*`,
        // Category search patterns
        `search:categories:store=*:*`,
        `search:categories:*`,
        // Provider search patterns
        `search:providers:store=*:*`,
        `search:providers:*`,
        // Unit search patterns
        `search:units:store=*:*`,
        `search:units:*`,
        // Store-specific patterns
        `store:*:brands*`,
        `store:*:categories*`,
        `store:*:providers*`,
        `store:*:units*`,
        // General patterns
        `*:brands:*`,
        `*:categories:*`,
        `*:providers:*`,
        `*:units:*`,
      ];
      
      // Check if our pattern matches any common patterns
      for (const commonPattern of commonPatterns) {
        if (this.patternMatches(pattern, commonPattern)) {
          this.logger.debug(`Pattern ${pattern} matches common pattern ${commonPattern}, attempting manual invalidation`);
          
          // Try to delete some common cache keys manually
          const keysToTry = this.generateCommonKeys(pattern, entityType, storeId);
          
          for (const key of keysToTry) {
            try {
              await this.del(key);
              deletedCount++;
              this.logger.debug(`Fallback deleted key: ${key}`);
            } catch (error) {
              // Key might not exist, that's okay
              this.logger.debug(`Fallback key not found: ${key}`);
            }
          }
        }
      }
      
      this.logger.debug(`Fallback pattern invalidation completed, deleted ${deletedCount} keys`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Fallback pattern invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Check if a pattern matches another pattern
   */
  private patternMatches(pattern: string, commonPattern: string): boolean {
    // Simple pattern matching - convert wildcards to regex
    const regexPattern = commonPattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pattern);
  }

  /**
   * Generate common cache keys based on a pattern
   */
  private generateCommonKeys(pattern: string, entityType: string | null, storeId: string | null): string[] {
    const keys: string[] = [];
    
    if (storeId) {
      // Generate store-specific keys
      keys.push(`store:${storeId}:brands`);
      keys.push(`store:${storeId}:categories`);
      keys.push(`store:${storeId}:providers`);
      keys.push(`store:${storeId}:units`);
      
      // Generate search cache keys for all entity types
      const entityTypes = ['brands', 'categories', 'providers', 'units'];
      const commonQueries = ['', 'test', 'search', 'query'];
      const commonPages = [1, 2];
      const commonLimits = [10, 20, 50, 100];
      
      for (const entity of entityTypes) {
        for (const query of commonQueries) {
          for (const page of commonPages) {
            for (const limit of commonLimits) {
              const filtersKey = 'no-filters';
              keys.push(`search:${entity}:store=${storeId}:q=${query}:page=${page}:limit=${limit}:filters:${filtersKey}`);
            }
          }
        }
      }
    }
    
    // Add general entity keys
    const entityTypes = ['brands', 'categories', 'providers', 'units'];
    for (const entity of entityTypes) {
      keys.push(`search:${entity}:*`);
      keys.push(`${entity}:*`);
    }
    
    return keys;
  }

  /**
   * Get Redis client for advanced operations
   */
  private getRedisClient(): any {
    try {
      this.logger.debug('Attempting to get Redis client...');
      
      // Access the underlying Redis client from the cache manager
      const store = (this.cacheManager as any).store;
      this.logger.debug('Cache store:', store ? 'Found' : 'Not found');
      
      if (!store) {
        this.logger.warn('Cache store not found');
        return null;
      }
      
      // Try different ways to access the Redis client
      let client = null;
      
      // Method 1: Direct client property
      if (store.client) {
        client = store.client;
        this.logger.debug('Found Redis client via store.client');
      }
      // Method 2: getClient method
      else if (store.getClient && typeof store.getClient === 'function') {
        client = store.getClient();
        this.logger.debug('Found Redis client via store.getClient()');
      }
      // Method 3: Redis store specific
      else if (store._redis) {
        client = store._redis;
        this.logger.debug('Found Redis client via store._redis');
      }
      // Method 4: Check if store itself is the client
      else if (store.scan && typeof store.scan === 'function') {
        client = store;
        this.logger.debug('Found Redis client via store.scan method');
      }
      
      this.logger.debug('Redis client:', client ? 'Found' : 'Not found');
      
      if (!client) {
        this.logger.warn('Redis client not available - pattern invalidation will not work');
        this.logger.debug('Available store properties:', Object.keys(store));
      }
      
      return client;
    } catch (error) {
      this.logger.error('Failed to get Redis client:', error);
      return null;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache<T>(
    keys: Array<{ key: string; factory: () => Promise<T>; ttl?: number }>,
  ): Promise<void> {
    this.logger.log(`Starting cache warming for ${keys.length} keys`);
    
    const promises = keys.map(async ({ key, factory, ttl }) => {
      try {
        const existing = await this.get(key);
        if (existing === undefined) {
          const value = await factory();
          await this.set(key, value, { ttl: ttl || 300 });
          this.logger.debug(`Cache warmed for key: ${key}`);
        }
      } catch (error) {
        this.logger.error(`Cache warming failed for key: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
    this.logger.log('Cache warming completed');
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      const redisClient = this.getRedisClient();
      if (!redisClient) {
        return -1;
      }
      return await redisClient.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Cache for user-specific data
   */
  async cacheUserData<T>(
    userId: string,
    dataType: string,
    data: T,
    options?: CacheOptions,
  ): Promise<void> {
    const key = this.generateKey({ userId, entityType: dataType });
    await this.set(key, data, { ttl: 600, ...options }); // 10 minutes default for user data
  }

  /**
   * Get user-specific cached data
   */
  async getUserData<T>(userId: string, dataType: string): Promise<T | undefined> {
    const key = this.generateKey({ userId, entityType: dataType });
    return this.get<T>(key);
  }

  /**
   * Cache for store-specific data
   */
  async cacheStoreData<T>(
    storeId: string,
    dataType: string,
    data: T,
    options?: CacheOptions,
  ): Promise<void> {
    const key = this.generateKey({ storeId, entityType: dataType });
    await this.set(key, data, { ttl: 300, ...options }); // 5 minutes default for store data
  }

  /**
   * Get store-specific cached data
   */
  async getStoreData<T>(storeId: string, dataType: string): Promise<T | undefined> {
    const key = this.generateKey({ storeId, entityType: dataType });
    return this.get<T>(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults<T>(
    keyOptions: CacheKeyOptions,
    results: T,
    options?: CacheOptions,
  ): Promise<void> {
    const key = this.generateKey(keyOptions);
    await this.set(key, results, { ttl: 120, ...options }); // 2 minutes default for search results
  }

  /**
   * Get cached search results
   */
  async getSearchResults<T>(keyOptions: CacheKeyOptions): Promise<T | undefined> {
    const key = this.generateKey(keyOptions);
    return this.get<T>(key);
  }

  /**
   * Invalidate all cache for a specific store
   */
  async invalidateStoreCache(storeId: string): Promise<number> {
    return this.invalidatePattern(`store:${storeId}*`);
  }

  /**
   * Invalidate all cache for a specific user
   */
  async invalidateUserCache(userId: string): Promise<number> {
    return this.invalidatePattern(`user:${userId}*`);
  }

  /**
   * Batch operations for better performance
   */
  async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
    try {
      const redisClient = this.getRedisClient();
      if (!redisClient) {
        // Fallback to individual gets
        return Promise.all(keys.map(key => this.get<T>(key)));
      }

      const values = await redisClient.mget(...keys);
      return values.map((value: any) => {
        if (value === null || value === undefined) {
          this.metrics.misses++;
          return undefined;
        }
        this.metrics.hits++;
        return JSON.parse(value);
      });
    } catch (error) {
      this.logger.error('Cache MGET error:', error);
      this.metrics.errors++;
      return keys.map(() => undefined);
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * Batch set operations
   */
  async mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    try {
      const redisClient = this.getRedisClient();
      if (!redisClient) {
        // Fallback to individual sets
        await Promise.all(items.map(item => this.set(item.key, item.value, { ttl: item.ttl })));
        return;
      }

      const pipeline = redisClient.pipeline();
      items.forEach(({ key, value, ttl }) => {
        pipeline.setex(key, ttl || 300, JSON.stringify(value));
      });
      
      await pipeline.exec();
      this.metrics.sets += items.length;
      this.logger.debug(`Cache MSET completed for ${items.length} keys`);
    } catch (error) {
      this.logger.error('Cache MSET error:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Simple hash function for generating cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
} 