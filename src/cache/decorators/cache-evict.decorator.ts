import { SetMetadata } from '@nestjs/common';

export interface CacheEvictOptions {
  key?: string; // Specific cache key to evict
  pattern?: string; // Pattern to match multiple keys (e.g., 'user:*')
  keyGenerator?: (...args: any[]) => string; // Dynamic key generation for eviction
  patternGenerator?: (...args: any[]) => string; // Dynamic pattern generation
  condition?: (...args: any[]) => boolean; // Conditional eviction
  allEntries?: boolean; // Clear all cache entries
  beforeInvocation?: boolean; // Evict before method execution (default: after)
}

export const CACHE_EVICT_METADATA = 'cache-evict:metadata';

/**
 * Decorator to mark methods for automatic cache eviction
 * 
 * @param options Cache eviction configuration options
 * 
 * @example
 * ```typescript
 * @CacheEvict({ 
 *   keyGenerator: (userId) => `user:${userId}` 
 * })
 * async updateUser(userId: string, userData: UpdateUserDto) {
 *   return this.userRepository.update(userId, userData);
 * }
 * 
 * @CacheEvict({ 
 *   pattern: 'store:*',
 *   patternGenerator: (storeId) => `store:${storeId}:*`
 * })
 * async updateStore(storeId: string, storeData: UpdateStoreDto) {
 *   return this.storeRepository.update(storeId, storeData);
 * }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_EVICT_METADATA, {
      key: options.key,
      pattern: options.pattern,
      keyGenerator: options.keyGenerator,
      patternGenerator: options.patternGenerator,
      condition: options.condition,
      allEntries: options.allEntries || false,
      beforeInvocation: options.beforeInvocation || false,
      methodName: propertyKey,
      className: target.constructor.name,
    })(target, propertyKey, descriptor);

    return descriptor;
  };
}

/**
 * Predefined cache eviction patterns for common operations
 */
export const EvictionPatterns = {
  /**
   * Evict user-specific cache entries
   */
  User: (keyGenerator?: (userId: string) => string): CacheEvictOptions => ({
    keyGenerator: keyGenerator || ((userId: string) => `user:${userId}`),
  }),

  /**
   * Evict all store-related cache entries
   */
  StoreAll: (patternGenerator?: (storeId: string) => string): CacheEvictOptions => ({
    patternGenerator: patternGenerator || ((storeId: string) => `store:${storeId}:*`),
  }),

  /**
   * Evict specific store data type
   */
  StoreType: (typeKeyGenerator?: (storeId: string, type: string) => string): CacheEvictOptions => ({
    keyGenerator: typeKeyGenerator || ((storeId: string, type: string) => `store:${storeId}:${type}`),
  }),

  /**
   * Evict search results cache
   */
  SearchResults: (patternGenerator?: (...args: any[]) => string): CacheEvictOptions => ({
    patternGenerator: patternGenerator || (() => 'search:*'),
  }),

  /**
   * Evict all cache entries (use with caution)
   */
  All: (): CacheEvictOptions => ({
    allEntries: true,
  }),

  /**
   * Conditional eviction based on method parameters
   */
  Conditional: (
    condition: (...args: any[]) => boolean,
    keyGenerator: (...args: any[]) => string,
  ): CacheEvictOptions => ({
    condition,
    keyGenerator,
  }),
}; 