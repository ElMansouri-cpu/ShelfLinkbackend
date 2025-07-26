import { SetMetadata } from '@nestjs/common';

export interface CacheEvictOptions {
  key?: string; // Specific cache key to evict
  pattern?: string; // Pattern to match multiple keys (e.g., 'user:*')
  keyGenerator?: (...args: any[]) => string; // Dynamic key generation for eviction
  patternGenerator?: (...args: any[]) => string; // Dynamic pattern generation
  condition?: (...args: any[]) => boolean; // Conditional eviction
  allEntries?: boolean; // Clear all cache entries
  beforeInvocation?: boolean; // Evict before method execution (default: after)
  cascade?: boolean; // Cascade eviction to related entities
  cascadePatterns?: string[]; // Additional patterns to evict when cascading
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
      cascade: options.cascade || false,
      cascadePatterns: options.cascadePatterns || [],
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

  /**
   * CRUD operation eviction patterns
   */
  CRUD: {
    /**
     * Create operation - evict list caches and search caches
     */
    Create: (storeIdGenerator: (...args: any[]) => string, entityType: string): CacheEvictOptions => ({
      patternGenerator: (storeId: string) => [
        `store:${storeId}:${entityType}*`,
        `search:${entityType}:*`,
        `store:${storeId}:${entityType}:list*`,
        `store:${storeId}:${entityType}:query*`,
      ].join('|'),
      cascade: true,
      cascadePatterns: [
        `store:${storeIdGenerator()}:stats*`,
        `store:${storeIdGenerator()}:counts*`,
      ],
    }),

    /**
     * Update operation - evict specific entity and related caches
     */
    Update: (
      idGenerator: (...args: any[]) => string | number,
      storeIdGenerator: (...args: any[]) => string,
      entityType: string
    ): CacheEvictOptions => ({
      keyGenerator: (id: string | number, storeId: string) => `${entityType}:${id}:store:${storeId}`,
      patternGenerator: (id: string | number, storeId: string) => [
        `${entityType}:${id}*`,
        `store:${storeId}:${entityType}*`,
        `search:${entityType}:*`,
      ].join('|'),
      cascade: true,
      cascadePatterns: [
        `store:${storeIdGenerator()}:stats*`,
        `store:${storeIdGenerator()}:counts*`,
      ],
    }),

    /**
     * Delete operation - evict specific entity and related caches
     */
    Delete: (
      idGenerator: (...args: any[]) => string | number,
      storeIdGenerator: (...args: any[]) => string,
      entityType: string
    ): CacheEvictOptions => ({
      keyGenerator: (id: string | number, storeId: string) => `${entityType}:${id}:store:${storeId}`,
      patternGenerator: (id: string | number, storeId: string) => [
        `${entityType}:${id}*`,
        `store:${storeId}:${entityType}*`,
        `search:${entityType}:*`,
      ].join('|'),
      cascade: true,
      cascadePatterns: [
        `store:${storeIdGenerator()}:stats*`,
        `store:${storeIdGenerator()}:counts*`,
      ],
    }),

    /**
     * Bulk operation - evict all related caches
     */
    Bulk: (storeIdGenerator: (...args: any[]) => string, entityType: string): CacheEvictOptions => ({
      patternGenerator: (storeId: string) => [
        `store:${storeId}:${entityType}*`,
        `search:${entityType}:*`,
        `${entityType}:*`,
      ].join('|'),
      cascade: true,
      cascadePatterns: [
        `store:${storeIdGenerator()}:stats*`,
        `store:${storeIdGenerator()}:counts*`,
      ],
    }),
  },

  /**
   * Entity-specific eviction patterns
   */
  Entity: {
    /**
     * Brand-specific eviction patterns
     */
    Brand: {
      Create: (storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Create(storeIdGenerator, 'brands'),
      
      Update: (idGenerator: (...args: any[]) => string | number, storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Update(idGenerator, storeIdGenerator, 'brands'),
      
      Delete: (idGenerator: (...args: any[]) => string | number, storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Delete(idGenerator, storeIdGenerator, 'brands'),
      
      Bulk: (storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Bulk(storeIdGenerator, 'brands'),
    },

    /**
     * Category-specific eviction patterns
     */
    Category: {
      Create: (storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Create(storeIdGenerator, 'categories'),
      
      Update: (idGenerator: (...args: any[]) => string | number, storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Update(idGenerator, storeIdGenerator, 'categories'),
      
      Delete: (idGenerator: (...args: any[]) => string | number, storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Delete(idGenerator, storeIdGenerator, 'categories'),
      
      Bulk: (storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Bulk(storeIdGenerator, 'categories'),
    },

    /**
     * Provider-specific eviction patterns
     */
    Provider: {
      Create: (storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Create(storeIdGenerator, 'providers'),
      
      Update: (idGenerator: (...args: any[]) => string | number, storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Update(idGenerator, storeIdGenerator, 'providers'),
      
      Delete: (idGenerator: (...args: any[]) => string | number, storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Delete(idGenerator, storeIdGenerator, 'providers'),
      
      Bulk: (storeIdGenerator: (...args: any[]) => string): CacheEvictOptions => 
        EvictionPatterns.CRUD.Bulk(storeIdGenerator, 'providers'),
    },
  },
}; 