import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Brand } from '../entities/brand.entity';
import { CacheEvict, Cacheable } from '../../cache/decorators';
import { QueryDslOperator, QueryDslTextQueryType } from '@elastic/elasticsearch/lib/api/types';

@Injectable()
export class BrandSearchService extends BaseSearchService<Brand> implements OnModuleInit {
  protected readonly index = 'brands';
  protected readonly searchFields = [
    'name',
    'description',
    'store.name'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {
    super(esService);
  }

  async onModuleInit() {
    try {
      console.log('Initializing brand search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Brand search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize brand search service:', error);
      throw error;
    }
  }

  private async reindexAll() {
    try {
      console.log('Starting reindex of all brands...');
      const brands = await this.brandRepository.find({
        relations: ['store'],
      });
      
      if (brands.length === 0) {
        console.log('No brands found to index');
        return;
      }

      console.log(`Found ${brands.length} brands to index`);
      
      // Delete existing index if it exists
      try {
        await this.esService.indices.delete({ index: this.index });
        console.log(`Deleted existing index ${this.index}`);
      } catch (error) {
        // Ignore error if index doesn't exist
      }

      // Create fresh index
      await this.createIndexIfNotExists();
      console.log(`Created fresh index ${this.index}`);

      // Index all brands
      const operations: any[] = [];
      for (const brand of brands) {
        const flattenedEntity = await this.flattenEntity(brand);
        operations.push({ index: { _index: this.index, _id: brand.id.toString() } });
        operations.push(flattenedEntity);
      }

      const response = await this.esService.bulk({ 
        body: operations,
        refresh: true
      });

      if (response.errors) {
        const errors = response.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error);
        console.error('Bulk indexing errors:', errors);
        throw new Error('Failed to index brands');
      }

      console.log(`Successfully indexed ${brands.length} brands`);
    } catch (error) {
      console.error('Failed to reindex brands:', error);
      throw error;
    }
  }

  protected async flattenEntity(brand: Brand): Promise<any> {
    return {
      id: brand.id,
      name: brand.name,
      image: brand.image,
      website: brand.website,
      description: brand.description,
      status: brand.status,
      productsCount: brand.productsCount,
      storeId: brand.storeId,
      
      store: brand.store ? {
        id: brand.store.id,
        name: brand.store.name,
        logo: brand.store.logo,
        url: brand.store.url,
        status: brand.store.status,
      } : null,
      
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  @Cacheable({
    ttl: 300,
    keyGenerator: (query = '', filters = {}) => {
      const { page = 1, limit = 50, storeId, ...cleanFilters } = filters;
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:brands:store=${storeId}:q=${query}:page=${page}:limit=${limit}:filters:${filtersKey}`;
    },
  })
  async searchEntities(query: string, filters: Record<string, any> = {}) {
    const { page = 1, limit = 50, storeId, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);
  
    // Build filter conditions
    const mustFilters: Array<{ term: Record<string, any> }> = [];
    
    // Add store filter if provided
    if (storeId) {
      mustFilters.push({ term: { storeId } });
    }

    // Add other filters
    Object.entries(cleanFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        mustFilters.push({ term: { [key]: val } });
      }
    });
  
    // Build search query
    const shouldQuery = query?.trim()
      ? [
          // Exact match with wildcards (highest priority)
          {
            bool: {
              should: [
                { wildcard: { 'name.keyword': { value: `*${query}*` } } },
                { wildcard: { 'name.keyword': { value: `${query}*` } } },
                { wildcard: { 'name.keyword': { value: `*${query}` } } }
              ],
              minimum_should_match: 1,
              boost: 3
            }
          },
          // Prefix match for name
          {
            prefix: {
              'name.keyword': {
                value: query,
                boost: 2
              }
            }
          },
          // Fuzzy match for name
          {
            match: {
              name: {
                query,
                fuzziness: 'AUTO',
                boost: 1.5
              }
            }
          },
          // Match in other fields
          {
            multi_match: {
              query,
              fields: [
                'description^1',
                'store.name^1'
              ],
              type: 'best_fields' as QueryDslTextQueryType,
              fuzziness: 'AUTO',
              operator: 'or' as QueryDslOperator,
              minimum_should_match: '2<75%',
              tie_breaker: 0.3
            }
          }
        ]
      : [];
  
    // Construct final query
    const queryBody = {
      bool: {
        must: mustFilters,
        ...(shouldQuery.length > 0 && {
          should: shouldQuery,
          minimum_should_match: 1
        })
      }
    };
  
    console.log('Search query:', JSON.stringify(queryBody, null, 2));
  
    const response = await this.esService.search({
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
      sort: [
        { _score: { order: 'desc' } },
        { 'name.keyword': { order: 'asc' } }
      ]
    });

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

  @CacheEvict({
    patternGenerator: (storeId) => `search:brands:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    try {
      console.log(`Starting reindex for store ${storeId}...`);
      const brands = await this.brandRepository.find({
        where: { storeId },
        relations: ['store'],
      });

      if (brands.length === 0) {
        console.log(`No brands found for store ${storeId}`);
        return;
      }

      console.log(`Found ${brands.length} brands for store ${storeId}`);

      // Delete existing documents for this store
      await this.esService.deleteByQuery({
        index: this.index,
        body: {
          query: {
            term: { storeId }
          }
        }
      });

      // Index new documents
      const operations: any[] = [];
      for (const brand of brands) {
        const flattenedEntity = await this.flattenEntity(brand);
        operations.push({ index: { _index: this.index, _id: brand.id.toString() } });
        operations.push(flattenedEntity);
      }

      const response = await this.esService.bulk({ 
        body: operations,
        refresh: true
      });

      if (response.errors) {
        const errors = response.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error);
        console.error('Bulk indexing errors:', errors);
        throw new Error(`Failed to index brands for store ${storeId}`);
      }

      console.log(`Successfully indexed ${brands.length} brands for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex brands for store ${storeId}:`, error);
      throw error;
    }
  }
} 