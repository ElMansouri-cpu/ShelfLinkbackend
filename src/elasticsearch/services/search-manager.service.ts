import { Injectable, Optional, Inject } from '@nestjs/common';
import { BrandSearchService } from '../../brands/services/brand-search.service';
import { CategorySearchService } from '../../categories/services/category-search.service';
import { OrderSearchService } from '../../orders/services/order-search.service';
import { UnitSearchService } from '../../unit/services/unit-search.service';
import { TaxSearchService } from '../../products/services/tax-search.service';
import { VariantSearchService } from '../../products/services/variant-search.service';
import { Cacheable, CacheEvict, CachePatterns } from '../../cache/decorators';

@Injectable()
export class SearchManagerService {
  constructor(
    private readonly brandSearchService: BrandSearchService,
    private readonly categorySearchService: CategorySearchService,
    private readonly orderSearchService: OrderSearchService,
    private readonly unitSearchService: UnitSearchService,
    private readonly taxSearchService: TaxSearchService,
    private readonly variantSearchService: VariantSearchService,
  ) {}

  /**
   * Reindex all entities for a specific store with cache invalidation
   * Invalidates all search caches for the store when reindexing
   */
  @CacheEvict({
    patternGenerator: (storeId) => `search:*:${storeId}:*`,
  })
  async reindexStore(storeId: string): Promise<void> {
    await Promise.all([
      this.brandSearchService.reindexByStore(storeId),
      this.categorySearchService.reindexByStore(storeId),
      this.orderSearchService.reindexByStore(storeId),
      this.unitSearchService.reindexByStore(storeId),
      this.taxSearchService.reindexByStore(storeId),
      this.variantSearchService.reindexVariantsByStore(storeId),
    ]);
  }

  /**
   * Global search across all entities with aggressive caching
   * Search results are cached for 2 minutes
   */
  @Cacheable(CachePatterns.Search((storeId, query, limit = 10) => `search:global:${storeId}:${query}:${limit}`))
  async globalSearch(storeId: string, query: string, limit: number = 10) {
    const results = await Promise.allSettled([
      this.brandSearchService.searchEntities(query, { storeId, limit }),
      this.categorySearchService.searchEntities(query, { storeId, limit }),
      this.orderSearchService.searchEntities(query, { storeId, limit }),
      this.unitSearchService.searchEntities(query, { storeId, limit }),
      this.taxSearchService.searchEntities(query, { storeId, limit }),
      this.variantSearchService.searchVariants(query, { storeId, limit }),
    ]);

    return {
      brands: results[0].status === 'fulfilled' ? results[0].value : { hits: [], total: 0 },
      categories: results[1].status === 'fulfilled' ? results[1].value : { hits: [], total: 0 },
      orders: results[2].status === 'fulfilled' ? results[2].value : { hits: [], total: 0 },
      units: results[3].status === 'fulfilled' ? results[3].value : { hits: [], total: 0 },
      taxes: results[4].status === 'fulfilled' ? results[4].value : { hits: [], total: 0 },
      variants: results[5].status === 'fulfilled' ? results[5].value : { hits: [], total: 0 },
    };
  }

  /**
   * Quick search for products/variants only (most common search)
   */
  @Cacheable(CachePatterns.Search((storeId, query, limit = 20) => `search:quick:variants:${storeId}:${query}:${limit}`))
  async quickProductSearch(storeId: string, query: string, limit: number = 20) {
    return this.variantSearchService.searchVariants(query, { storeId, limit });
  }

  /**
   * Search suggestions based on partial query
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (storeId, partialQuery) => `search:suggestions:${storeId}:${partialQuery}`,
  })
  async getSearchSuggestions(storeId: string, partialQuery: string): Promise<string[]> {
    // This would typically query elasticsearch for suggestions
    // For now, return a mock implementation
    const suggestions = [
      `${partialQuery} brand`,
      `${partialQuery} product`,
      `${partialQuery} category`,
    ];
    return suggestions.slice(0, 5);
  }

  /**
   * Get popular search terms with caching
   */
  @Cacheable({
    ttl: 3600, // 1 hour
    keyGenerator: (storeId, limit = 10) => `search:popular:${storeId}:${limit}`,
  })
  async getPopularSearchTerms(storeId: string, limit: number = 10): Promise<Array<{
    term: string;
    count: number;
  }>> {
    // This would typically analyze search logs
    // For now, return mock data
    return [
      { term: 'electronics', count: 150 },
      { term: 'clothing', count: 120 },
      { term: 'books', count: 90 },
      { term: 'home', count: 75 },
      { term: 'sports', count: 60 },
    ].slice(0, limit);
  }

  /**
   * Search with filters and facets
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (storeId, query, filters, limit) => `search:filtered:${storeId}:${query}:${JSON.stringify(filters)}:${limit}`,
  })
  async advancedSearch(storeId: string, query: string, filters: Record<string, any> = {}, limit: number = 20) {
    // Advanced search with category, price range, brand filters
    const variantResults = await this.variantSearchService.searchVariants(query, { 
      storeId, 
      limit,
      ...filters 
    });

    return {
      results: variantResults,
      facets: {
        categories: [], // Would be populated from elasticsearch aggregations
        brands: [],
        priceRanges: [],
      },
      total: 0, // Would be populated from actual search results count
    };
  }

  /**
   * Get search analytics with caching
   */
  @Cacheable({
    ttl: 1800, // 30 minutes
    keyGenerator: (storeId) => `search:analytics:${storeId}`,
  })
  async getSearchAnalytics(storeId: string): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    topQueries: Array<{ query: string; count: number }>;
    noResultQueries: Array<{ query: string; count: number }>;
    avgResultsPerQuery: number;
  }> {
    // This would analyze search logs and metrics
    // For now, return mock analytics data
    return {
      totalSearches: 1250,
      uniqueQueries: 380,
      topQueries: [
        { query: 'electronics', count: 150 },
        { query: 'clothing', count: 120 },
        { query: 'books', count: 90 },
      ],
      noResultQueries: [
        { query: 'xyz product', count: 15 },
        { query: 'unknown item', count: 8 },
      ],
      avgResultsPerQuery: 12.5,
    };
  }

  /**
   * Clear all search caches for a store
   */
  @CacheEvict({
    patternGenerator: (storeId) => `search:*:${storeId}:*`,
  })
  async clearSearchCaches(storeId: string): Promise<void> {
    // This method just clears caches - no actual operation needed
    console.log(`Cleared search caches for store: ${storeId}`);
  }
} 