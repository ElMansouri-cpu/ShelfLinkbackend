import { IEntityService } from '../interfaces/entity-service.interface';

/**
 * Abstract base class implementing the general flow for entity services:
 * - Handles Supabase (Postgres) operations
 * - Integrates Redis cache invalidation
 * - Syncs with Elasticsearch
 * - Provides monitoring hooks
 */
export abstract class BaseEntityService<T, CreateDto, UpdateDto>
  implements IEntityService<T, CreateDto, UpdateDto>
{
  constructor(
    protected readonly dbRepo: any, // Supabase/Postgres repo
    protected readonly cacheService: any, // Redis
    protected readonly searchService: any, // Elasticsearch
    protected readonly logger: any, // Logger
  ) {}

  /**
   * Create entity in DB, invalidate cache, index in ES
   */
  async create(storeId: string, dto: CreateDto): Promise<T> {
    const entity = await this.dbRepo.create(storeId, dto);
    await this.invalidateCache(storeId);
    if (this.searchService) {
      await this.searchService.index(entity);
    }
    this.logger.log('Created entity', { storeId, entity });
    return entity;
  }

  /**
   * Fetch/search from ES, cache results in Redis
   */
  async findAll(storeId: string, query: any): Promise<T[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get(cacheKey);
    if (!results) {
      if (this.searchService) {
        results = await this.searchService.search(storeId, query);
      } else {
        // Fallback to direct database query if search service is not available
        results = await this.dbRepo.find({ where: { storeId }, ...query });
      }
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  /**
   * Fetch single entity from ES
   */
  async findOne(storeId: string, id: string): Promise<T> {
    if (this.searchService) {
      return this.searchService.findById(storeId, id);
    } else {
      // Fallback to direct database query if search service is not available
      return this.dbRepo.findOne({ where: { id, storeId } });
    }
  }

  /**
   * Update in DB, invalidate cache, update ES
   */
  async update(storeId: string, id: string, dto: UpdateDto): Promise<T> {
    const entity = await this.dbRepo.update(storeId, id, dto);
    await this.invalidateCache(storeId);
    if (this.searchService) {
      await this.searchService.update(entity);
    }
    this.logger.log('Updated entity', { storeId, id, entity });
    return entity;
  }

  /**
   * Delete in DB, invalidate cache, remove from ES
   */
  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new Error('Entity has associations and cannot be deleted.');
    }
    await this.dbRepo.delete(storeId, id);
    await this.invalidateCache(storeId);
    if (this.searchService) {
      await this.searchService.remove(storeId, id);
    }
    this.logger.log('Deleted entity', { storeId, id });
  }

  /**
   * Check for associations before delete (must be implemented by subclass)
   */
  abstract checkAssociations(storeId: string, id: string): Promise<boolean>;

  /**
   * Invalidate all relevant cache keys for this entity
   */
  protected async invalidateCache(storeId: string) {
    await this.cacheService.invalidatePattern(`store:${storeId}:*`);
  }

  /**
   * Generate cache key for queries
   */
  protected getCacheKey(storeId: string, query: any): string {
    return `store:${storeId}:entity:${JSON.stringify(query)}`;
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<any> {
    // Implement checks for DB, cache, ES
    return { status: 'ok' };
  }

  /**
   * Metrics for monitoring
   */
  async getMetrics(): Promise<any> {
    // Implement metrics extraction
    return {};
  }
}
