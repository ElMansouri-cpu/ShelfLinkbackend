import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Category } from '../entities/category.entity';
import { CacheEvict, Cacheable } from '../../cache/decorators';
import { QueryDslOperator, QueryDslTextQueryType } from '@elastic/elasticsearch/lib/api/types';

@Injectable()
export class CategorySearchService extends BaseSearchService<Category> implements OnModuleInit {
  protected readonly index = 'categories';
  protected readonly searchFields = [
    'name',
    'description',
    'store.name'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {
    super(esService);
  }

  async onModuleInit() {
    try {
      console.log('Initializing category search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Category search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize category search service:', error);
      throw error;
    }
  }

  private async reindexAll() {
    try {
      console.log('Starting reindex of all categories...');
      const categories = await this.categoryRepository.find({
        relations: ['store', 'parent'],
      });
      
      if (categories.length === 0) {
        console.log('No categories found to index');
        return;
      }

      console.log(`Found ${categories.length} categories to index`);
      
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

      // Index all categories
      const operations: any[] = [];
      for (const category of categories) {
        const flattenedEntity = await this.flattenEntity(category);
        operations.push({ index: { _index: this.index, _id: category.id.toString() } });
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
        throw new Error('Failed to index categories');
      }

      console.log(`Successfully indexed ${categories.length} categories`);
    } catch (error) {
      console.error('Failed to reindex categories:', error);
      throw error;
    }
  }

  protected async flattenEntity(category: Category): Promise<any> {
    return {
      id: category.id,
      name: category.name,
      image: category.image,
      description: category.description,
      status: category.status,
      productsCount: category.productsCount,
      parentId: category.parentId,
      storeId: category.storeId,
      
      store: category.store ? {
        id: category.store.id,
        name: category.store.name,
        logo: category.store.logo,
        url: category.store.url,
        status: category.store.status,
      } : null,
      
      parent: category.parent ? {
        id: category.parent.id,
        name: category.parent.name,
      } : null,
      
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  @Cacheable({
    ttl: 300,
    keyGenerator: (query = '', filters = {}) => {
      const { page = 1, limit = 50, storeId, ...cleanFilters } = filters;
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:categories:store=${storeId}:q=${query}:page=${page}:limit=${limit}:filters:${filtersKey}`;
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
    patternGenerator: (storeId) => `search:categories:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    try {
      console.log(`Starting reindex for store ${storeId}...`);
      const categories = await this.categoryRepository.find({
        where: { storeId },
        relations: ['store', 'parent'],
      });

      if (categories.length === 0) {
        console.log(`No categories found for store ${storeId}`);
        return;
      }

      console.log(`Found ${categories.length} categories for store ${storeId}`);

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
      for (const category of categories) {
        const flattenedEntity = await this.flattenEntity(category);
        operations.push({ index: { _index: this.index, _id: category.id.toString() } });
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
        throw new Error(`Failed to index categories for store ${storeId}`);
      }

      console.log(`Successfully indexed ${categories.length} categories for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex categories for store ${storeId}:`, error);
      throw error;
    }
  }
} 