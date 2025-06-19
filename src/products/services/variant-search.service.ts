// src/variants/variant-search.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from '../entities/variant.entity';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Cacheable, CacheEvict, CachePatterns } from '../../cache/decorators';

@Injectable()
export class VariantSearchService extends BaseSearchService<Variant> implements OnModuleInit {
  protected readonly index = 'variants';
  protected readonly searchFields = [
    'name^3',
    'barcode',
    'description',
    'store.name^2',
    'brand.name^2',
    'category.name^2',
    'provider.name',
    'unit.name'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>
  ) {
    super(esService);
  }

  protected async flattenEntity(variant: Variant): Promise<any> {
    return {
      id: variant.id,
      name: variant.name,
      barcode: variant.barcode,
      description: variant.description,
      storeId: variant.storeId,

      store: variant.store ? {
        id: variant.store.id,
        name: variant.store.name,
        logo: variant.store.logo,
        banner: variant.store.banner,
        url: variant.store.url,
        description: variant.store.description,
        location: variant.store.location,
        isPrimary: variant.store.isPrimary,
        productsCount: variant.store.productsCount,
        ordersCount: variant.store.ordersCount
      } : null,

      image: variant.image,

      brand: variant.brand ? {
        id: variant.brand.id,
        name: variant.brand.name,
        image: variant.brand.image
      } : null,

      category: variant.category ? {
        id: variant.category.id,
        name: variant.category.name,
        image: variant.category.image
      } : null,

      provider: variant.provider ? {
        id: variant.provider.id,
        name: variant.provider.name
      } : null,

      unit: variant.unit ? {
        id: variant.unit.id,
        name: variant.unit.name
      } : null,

      prices: {
        buy: {
          ht: variant.buyPriceHt,
          discountPct: variant.buyDiscountPct,
          netHt: variant.buyPriceNetHt,
          ttc: variant.buyPriceTtc
        },
        sell: {
          ht: variant.sellPriceHt,
          ttc: variant.sellPriceTtc,
          margePct: variant.margePct,
          margeType: variant.margeType
        }
      },

      taxes: variant.taxes?.map((tax: any) => ({
        id: tax.id,
        name: tax.name,
        rate: tax.rate
      })) || []
    };
  }

  /**
   * Index variant with cache invalidation
   * Clears search caches when variant is indexed
   */
  @CacheEvict({
    patternGenerator: (variant) => `search:variants:*`,
  })
  async indexVariant(variant: Variant) {
    const result = await this.indexEntity(variant);
    
    // Refresh the index to make changes immediately visible
    try {
      await this.esService.indices.refresh({ index: this.index });
      console.log(`Refreshed index ${this.index} after indexing variant ${variant.id}`);
    } catch (error) {
      console.error(`Failed to refresh index ${this.index}:`, error);
    }
    
    return result;
  }

  /**
   * Remove variant with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `search:variants:*`,
  })
  async removeVariant(id: string) {
    return this.removeEntity(id);
  }

  /**
   * Reindex variants by store - required by BaseSearchService
   */
  @CacheEvict({
    patternGenerator: (storeId) => `search:variants:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    const variants = await this.variantRepository.find({
      where: { storeId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    if (variants.length === 0) {
      console.log(`No variants found for store ${storeId}`);
      return;
    }

    console.log(`Reindexing ${variants.length} variants for store ${storeId}`);
    await this.bulkIndex(variants);
  }

  // Re-index variants when related entities are updated
  @CacheEvict({
    patternGenerator: (storeId) => `search:variants:*`,
  })
  async reindexVariantsByStore(storeId: string) {
    const variants = await this.variantRepository.find({
      where: { storeId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (brandId) => `search:variants:*`,
  })
  async reindexVariantsByBrand(brandId: string) {
    const variants = await this.variantRepository.find({
      where: { brandId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (categoryId) => `search:variants:*`,
  })
  async reindexVariantsByCategory(categoryId: string) {
    const variants = await this.variantRepository.find({
      where: { categoryId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (providerId) => `search:variants:*`,
  })
  async reindexVariantsByProvider(providerId: string) {
    const variants = await this.variantRepository.find({
      where: { providerId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (unitId) => `search:variants:*`,
  })
  async reindexVariantsByUnit(unitId: string) {
    const variants = await this.variantRepository.find({
      where: { unitId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (taxId) => `search:variants:*`,
  })
  async reindexVariantsByTax(taxId: string) {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.store', 'store')
      .leftJoinAndSelect('variant.brand', 'brand')
      .leftJoinAndSelect('variant.category', 'category')
      .leftJoinAndSelect('variant.provider', 'provider')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('variant.taxes', 'taxes')
      .where('taxes.id = :taxId', { taxId })
      .getMany();

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  /**
   * Search variants with comprehensive caching
   * Cache varies by query, pagination, and filters
   */
    // @Cacheable({
    //   ttl: 300, // 5 minutes for search results
    //   keyGenerator: (query, filters = {}) => {
    //     const { page = 1, limit = 50, ...cleanFilters } = filters;
    //     const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
    //     return `search:variants:${query || 'all'}:page:${page}:limit:${limit}:filters:${filtersKey}`;
    //   },
    // })
  async searchVariants(query: string, filters: Record<string, any> = {}) {
    const { q, page = 1, limit = 50, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);
    
    // Decode the search query if it's URL encoded
    const decodedQuery = query ? decodeURIComponent(query) : '';
    console.log('Search query:', { original: query, decoded: decodedQuery });
  
    // Handle multiple values for the same filter (e.g., category.name=FROMAGE&category.name=SUCETTE)
    const mustFilters: any[] = [];
    const filterGroups: Record<string, any[]> = {};
    
    // Group filters by key to handle multiple values
    Object.entries(cleanFilters).forEach(([key, val]) => {
      if (!filterGroups[key]) {
        filterGroups[key] = [];
      }
      // Handle both single values and arrays
      if (Array.isArray(val)) {
        filterGroups[key].push(...val);
      } else {
        filterGroups[key].push(val);
      }
    });
    
    // Convert grouped filters to Elasticsearch query format
    Object.entries(filterGroups).forEach(([key, values]) => {
      console.log(`Processing filter: ${key} = ${JSON.stringify(values)}`);
      if (values.length === 1) {
        // Single value - use appropriate query type based on field
        const value = values[0];
        if (key === 'storeId') {
          // For storeId, use term with keyword field for exact matching
          mustFilters.push({
            term: { 'storeId.keyword': value }
          });
        } else if (key === 'brand.name') {
          // For brand.name, use term with keyword field for exact matching
          mustFilters.push({
            term: { 'brand.name.keyword': value }
          });
        } else if (key === 'category.name') {
          // For category.name, use term with keyword field for exact matching
          mustFilters.push({
            term: { 'category.name.keyword': value }
          });
        } else if (key.includes('.name')) {
          // For other name fields, use wildcard to handle spaces and partial matches
          mustFilters.push({
            wildcard: { [key]: { value: `*${value}*` } }
          });
        } else {
          // For other fields, use match
          mustFilters.push({
            match: { [key]: value }
          });
        }
      } else {
        // Multiple values - use should with appropriate query type
        const shouldClauses = values.map(value => {
          if (key === 'storeId') {
            // For storeId, use term with keyword field
            return {
              term: { 'storeId.keyword': value }
            };
          } else if (key === 'brand.name') {
            // For brand.name, use term with keyword field
            return {
              term: { 'brand.name.keyword': value }
            };
          } else if (key === 'category.name') {
            // For category.name, use term with keyword field
            return {
              term: { 'category.name.keyword': value }
            };
          } else if (key.includes('.name')) {
            // For other name fields, use wildcard
            return {
              wildcard: { [key]: { value: `*${value}*` } }
            };
          } else {
            // For other fields, use match
            return {
              match: { [key]: value }
            };
          }
        });
        
        mustFilters.push({
          bool: {
            should: shouldClauses,
            minimum_should_match: 1
          }
        });
      }
    });
    
    console.log('Final mustFilters:', JSON.stringify(mustFilters, null, 2));
  
    const shouldQuery = decodedQuery?.trim()
      ? [
          // Multi-match for fuzzy text search
          {
            multi_match: {
              query: decodedQuery,
              fields: [
                'name^3',           // Boost name matches
                'barcode',         // Regular barcode matches
                'description',     // Description matches
                'store.name^2',    // Boost store name matches
                'brand.name^2',    // Boost brand name matches
                'category.name^2', // Boost category name matches
                'provider.name',   // Provider name matches
                'unit.name'        // Unit name matches
              ],
              type: 'best_fields' as const,
              fuzziness: 'AUTO',
              operator: 'or' as const,
              minimum_should_match: '2<75%',
              tie_breaker: 0.3
            }
          },
          // Wildcard query for substring matching
          {
            bool: {
              should: [
                { wildcard: { name: { value: `*${decodedQuery}*` } } },
                { wildcard: { barcode: { value: `*${decodedQuery}*` } } },
                { wildcard: { description: { value: `*${decodedQuery}*` } } },
                { wildcard: { 'store.name': { value: `*${decodedQuery}*` } } },
                { wildcard: { 'brand.name': { value: `*${decodedQuery}*` } } },
                { wildcard: { 'category.name': { value: `*${decodedQuery}*` } } },
                { wildcard: { 'provider.name': { value: `*${decodedQuery}*` } } },
                { wildcard: { 'unit.name': { value: `*${decodedQuery}*` } } }
              ],
              minimum_should_match: 1
            }
          }
        ]
      : [];
  
    const queryBody = shouldQuery.length
      ? {
          bool: {
            should: shouldQuery,
            filter: mustFilters,
            minimum_should_match: 1
          },
        }
      : mustFilters.length
      ? {
          bool: {
            filter: mustFilters,
          },
        }
      : {
          match_all: {},
        };
  
    const response = await this.esService.search({
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
      sort: [
        { _score: { order: 'desc' } },  // Sort by relevance first
        { 'name.keyword': { order: 'asc' } }  // Then alphabetically by name
      ]
    });

    console.log('Elasticsearch query sent:', JSON.stringify({
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
      sort: [
        { _score: { order: 'desc' } },
        { 'name.keyword': { order: 'asc' } }
      ]
    }, null, 2));

    console.log('Elasticsearch response total hits:', response.hits.total);
    console.log('Elasticsearch response hits count:', response.hits.hits.length);

    // Transform to simplified response format
    const total = typeof response.hits.total === 'number' 
      ? response.hits.total 
      : response.hits.total?.value || 0;

    const totalPages = Math.ceil(total / Number(limit));

    return {
      data: response.hits.hits.map((hit: any) => hit._source),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPreviousPage: Number(page) > 1,
      },
    };
  }

  /**
   * Debug method to check what's indexed in Elasticsearch
   */
  async debugIndexedData(storeId: string): Promise<any> {
    try {
      const response = await this.esService.search({
        index: this.index,
        body: {
          query: {
            term: { 'storeId.keyword': storeId }
          },
          size: 10
        }
      });

      console.log(`Found ${response.hits.total} documents for store ${storeId}`);
      
      const documents = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        source: hit._source
      }));

      console.log('Sample indexed documents:', JSON.stringify(documents, null, 2));
      
      return {
        total: response.hits.total,
        documents
      };
    } catch (error) {
      console.error('Error debugging indexed data:', error);
      throw error;
    }
  }

  /**
   * Refresh the Elasticsearch index to make changes immediately visible
   */
  async refreshIndex(): Promise<void> {
    try {
      await this.esService.indices.refresh({ index: this.index });
      console.log(`Refreshed index ${this.index}`);
    } catch (error) {
      console.error(`Failed to refresh index ${this.index}:`, error);
      throw error;
    }
  }

  async onModuleInit() {
    try {
      console.log('Initializing VariantSearchService...');
      await this.createIndexIfNotExists();
      console.log('VariantSearchService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VariantSearchService:', error);
    }
  }
}
