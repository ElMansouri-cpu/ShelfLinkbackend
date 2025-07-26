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
  protected readonly indexName = 'brands';
  protected readonly searchFields = [
    'name',
    'description',
    'website',
    'store.name'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      console.log('Initializing brand search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Brand search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize brand search service:', error);
      // Don't throw error to prevent server crash, just log it
      console.log('Brand search service will be available but may need manual reindexing');
    }
  }

  public async createIndexIfNotExists() {
    try {
      const indexExists = await this.esService.indices.exists({
        index: this.indexName
      });

      if (!indexExists) {
        await this.esService.indices.create({
          index: this.indexName,
          body: {
            settings: {
              analysis: {
                filter: {
                  autocomplete_filter: {
                    type: 'edge_ngram',
                    min_gram: 1,
                    max_gram: 20
                  }
                },
                analyzer: {
                  autocomplete: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: [
                      'lowercase',
                      'autocomplete_filter'
                    ]
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: {
                  type: 'long'
                },
                name: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                image: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                website: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                description: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                status: {
                  type: 'keyword'
                },
                productsCount: {
                  type: 'integer'
                },
                storeId: {
                  type: 'keyword'
                },
                store: {
                  properties: {
                    id: {
                      type: 'keyword'
                    },
                    name: {
                      type: 'text',
                      analyzer: 'autocomplete',
                      search_analyzer: 'standard',
                      fields: {
                        keyword: {
                          type: 'keyword',
                          ignore_above: 256
                        }
                      }
                    },
                    logo: {
                      type: 'text'
                    },
                    url: {
                      type: 'text'
                    },
                    status: {
                      type: 'keyword'
                    }
                  }
                },
                createdAt: {
                  type: 'date'
                },
                updatedAt: {
                  type: 'date'
                }
              }
            }
          }
        });
        console.log(`Created index ${this.indexName} with proper mapping`);
      }
    } catch (error) {
      console.error(`Failed to create index ${this.indexName}:`, error);
      throw error;
    }
  }

  private async reindexAll() {
    try {
      console.log('Starting reindex of all brands...');
      const totalBrands = await this.brandRepository.count();
      console.log(`Total brands in database: ${totalBrands}`);
      
      if (totalBrands === 0) {
        console.log('No brands found in database, skipping reindex');
        return;
      }
      
      const brands = await this.brandRepository.find({
        relations: ['store'],
      });
      
      console.log(`Found ${brands.length} brands to index`);
      
      // Delete existing index if it exists
      try {
        await this.esService.indices.delete({ index: this.indexName });
        console.log(`Deleted existing index ${this.indexName}`);
      } catch (error) {
        // Ignore error if index doesn't exist
      }

      // Create fresh index
      await this.createIndexIfNotExists();
      console.log(`Created fresh index ${this.indexName}`);

      // Index all brands
      const operations: any[] = [];
      for (const brand of brands) {
        const flattenedEntity = await this.flattenEntity(brand);
        operations.push({ index: { _index: this.indexName, _id: brand.id.toString() } });
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

  async indexEntity(entity: Brand): Promise<void> {
    try {
      // Load relations if not already loaded
      let brandWithRelations = entity;
      if (!entity.store) {
        const foundBrand = await this.brandRepository.findOne({
          where: { id: entity.id },
          relations: ['store'],
        });
        if (!foundBrand) {
          console.warn(`Brand ${entity.id} not found for indexing`);
          return;
        }
        brandWithRelations = foundBrand;
      }

      const flattenedEntity = await this.flattenEntity(brandWithRelations);
      
      await this.esService.index({
        index: this.indexName,
        id: entity.id.toString(),
        body: flattenedEntity,
        refresh: true,
      });
      
      console.log(`Successfully indexed brand ${entity.id}`);
    } catch (error) {
      console.error(`Failed to index brand ${entity.id}:`, error);
      throw error;
    }
  }

  async removeEntity(id: string | number): Promise<void> {
    try {
      await this.esService.delete({
        index: this.indexName,
        id: id.toString(),
        refresh: true,
      });
      console.log(`Successfully removed brand ${id} from index`);
    } catch (error) {
      console.error(`Failed to remove brand ${id} from index:`, error);
      throw error;
    }
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
                'website^1',
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

    const response = await this.esService.search({
      index: this.indexName,
      body: {
        query: queryBody,
        from,
        size: limit,
        sort: [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ]
      }
    });

    const hits = response.hits.hits;
    const total = response.hits.total as any;

    return {
      data: hits.map((hit: any) => hit._source),
      pagination: {
        total: typeof total === 'number' ? total : total.value,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((typeof total === 'number' ? total : total.value) / Number(limit)),
        hasNextPage: Number(page) * Number(limit) < (typeof total === 'number' ? total : total.value),
        hasPreviousPage: Number(page) > 1
      }
    };
  }

  async reindexByStore(storeId: string): Promise<void> {
    try {
      console.log(`Starting reindex of brands for store ${storeId}...`);
      
      const brands = await this.brandRepository.find({
        where: { storeId },
        relations: ['store'],
      });
      
      console.log(`Found ${brands.length} brands to reindex for store ${storeId}`);
      
      // Delete existing documents for this store
      await this.esService.deleteByQuery({
        index: this.indexName,
        body: {
          query: {
            term: { storeId }
          }
        },
        refresh: true
      });
      
      // Index all brands for this store
      const operations: any[] = [];
      for (const brand of brands) {
        const flattenedEntity = await this.flattenEntity(brand);
        operations.push({ index: { _index: this.indexName, _id: brand.id.toString() } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        const response = await this.esService.bulk({ 
          body: operations,
          refresh: true
        });

        if (response.errors) {
          const errors = response.items
            .filter((item: any) => item.index?.error)
            .map((item: any) => item.index.error);
          console.error('Bulk reindexing errors:', errors);
          throw new Error('Failed to reindex brands for store');
        }
      }
      
      console.log(`Successfully reindexed ${brands.length} brands for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex brands for store ${storeId}:`, error);
      throw error;
    }
  }

  async debugIndex(): Promise<void> {
    try {
      const response = await this.esService.search({
        index: this.indexName,
        body: {
          query: { match_all: {} },
          size: 10
        }
      });
      
      console.log('Index debug info:');
      console.log('Total documents:', response.hits.total);
      console.log('Sample documents:', response.hits.hits.map((hit: any) => hit._source));
    } catch (error) {
      console.error('Failed to debug index:', error);
    }
  }
} 