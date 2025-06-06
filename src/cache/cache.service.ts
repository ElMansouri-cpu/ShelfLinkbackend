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

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: AppConfigService,
  ) {}

  /**
   * Generate a cache key based on provided options
   */
  generateKey(keyOptions: CacheKeyOptions): string {
    const parts: string[] = [];

    if (keyOptions.userId) {
      parts.push(`user:${keyOptions.userId}`);
    }

    if (keyOptions.storeId) {
      parts.push(`store:${keyOptions.storeId}`);
    }

    if (keyOptions.entityType) {
      parts.push(`entity:${keyOptions.entityType}`);
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
        return value;
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
        return undefined;
      }
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
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
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete specific key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
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
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
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
   * Invalidate cache patterns (e.g., all cache keys for a specific store)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Note: This would require Redis SCAN command for pattern matching
      // For now, we'll log the pattern for manual cleanup
      this.logger.warn(`Cache invalidation requested for pattern: ${pattern}`);
      // TODO: Implement pattern-based cache invalidation
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
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
  async invalidateStoreCache(storeId: string): Promise<void> {
    await this.invalidatePattern(`store:${storeId}*`);
  }

  /**
   * Invalidate all cache for a specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}*`);
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