import { SetMetadata } from '@nestjs/common';

export interface CacheableOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  keyGenerator?: (...args: any[]) => string; // Dynamic key generation
  condition?: (...args: any[]) => boolean; // Conditional caching
  unless?: (...args: any[]) => boolean; // Skip caching condition
}

export const CACHEABLE_METADATA = 'cacheable:metadata';

/**
 * Decorator to mark methods for automatic caching
 * 
 * @param options Cache configuration options
 * 
 * @example
 * ```typescript
 * @Cacheable({ ttl: 300, key: 'user-profile' })
 * async getUserProfile(userId: string) {
 *   return this.userRepository.findOne(userId);
 * }
 * 
 * @Cacheable({ 
 *   ttl: 600, 
 *   keyGenerator: (storeId, type) => `store:${storeId}:${type}` 
 * })
 * async getStoreData(storeId: string, type: string) {
 *   return this.storeRepository.findByStoreAndType(storeId, type);
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Set metadata for the interceptor to read
    SetMetadata(CACHEABLE_METADATA, {
      ttl: options.ttl || 300, // Default 5 minutes
      key: options.key,
      keyGenerator: options.keyGenerator,
      condition: options.condition,
      unless: options.unless,
      methodName: propertyKey,
      className: target.constructor.name,
    })(target, propertyKey, descriptor);

    return descriptor;
  };
}

/**
 * Predefined cache configurations for common patterns
 */
export const CachePatterns = {
  /**
   * User-specific data caching (10 minutes)
   */
  User: (keyGenerator?: (userId: string) => string): CacheableOptions => ({
    ttl: 600,
    keyGenerator: keyGenerator || ((userId: string) => `user:${userId}`),
  }),

  /**
   * Store-specific data caching (5 minutes)
   */
  Store: (keyGenerator?: (storeId: string, type?: string) => string): CacheableOptions => ({
    ttl: 300,
    keyGenerator: keyGenerator || ((storeId: string, type = 'data') => `store:${storeId}:${type}`),
  }),

  /**
   * Search result caching (2 minutes)
   */
  Search: (keyGenerator?: (...args: any[]) => string): CacheableOptions => ({
    ttl: 120,
    keyGenerator: keyGenerator || ((...args) => `search:${JSON.stringify(args)}`),
  }),

  /**
   * Static/reference data caching (1 hour)
   */
  Static: (key: string): CacheableOptions => ({
    ttl: 3600,
    key: `static:${key}`,
  }),

  /**
   * Short-term caching for frequently changing data (30 seconds)
   */
  ShortTerm: (keyGenerator: (...args: any[]) => string): CacheableOptions => ({
    ttl: 30,
    keyGenerator,
  }),
}; 