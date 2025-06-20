import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { BaseSearchService } from '../../common/services/base-search.service';
import { CacheEvict, Cacheable } from '../../cache/decorators';

@Injectable()
export class ProviderSearchService extends BaseSearchService<Provider> implements OnModuleInit {
  protected readonly index = 'providers';
  protected readonly searchFields = ['name', 'email', 'phoneNumber', 'address'];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {
    super(esService);
  }

  async onModuleInit() {
    try {
      console.log('Initializing provider search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Provider search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize provider search service:', error);
      console.log('Provider search service will be available but may need manual reindexing');
    }
  }

  protected async createIndexIfNotExists() {
    try {
      const indexExists = await this.esService.indices.exists({ index: this.index });
      if (!indexExists) {
        await this.esService.indices.create({
          index: this.index,
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
                    filter: ['lowercase', 'autocomplete_filter']
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'long' },
                name: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                },
                email: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                },
                phoneNumber: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                },
                address: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                },
                image: { type: 'text' },
                location: { type: 'text' },
                storeId: { type: 'keyword' },
                userId: { type: 'keyword' },
                contactInfo: { type: 'object' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            }
          }
        });
        console.log(`Created index ${this.index} with proper mapping`);
      }
    } catch (error) {
      console.error(`Failed to create index ${this.index}:`, error);
      throw error;
    }
  }

  private async reindexAll() {
    try {
      console.log('Starting reindex of all providers...');
      const totalProviders = await this.providerRepository.count();
      console.log(`Total providers in database: ${totalProviders}`);
      
      if (totalProviders === 0) {
        console.log('No providers found in database, skipping reindex');
        return;
      }
      
      const providers = await this.providerRepository.find();
      console.log(`Found ${providers.length} providers to index`);
      
      try {
        await this.esService.indices.delete({ index: this.index });
        console.log(`Deleted existing index ${this.index}`);
      } catch (error) {
        // Ignore error if index doesn't exist
      }

      await this.createIndexIfNotExists();
      console.log(`Created fresh index ${this.index}`);

      const operations: any[] = [];
      for (const provider of providers) {
        const flattenedEntity = await this.flattenEntity(provider);
        operations.push({ index: { _index: this.index, _id: provider.id.toString() } });
        operations.push(flattenedEntity);
      }

      const response = await this.esService.bulk({ body: operations, refresh: true });

      if (response.errors) {
        const errors = response.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error);
        console.error('Bulk indexing errors:', errors);
        throw new Error('Failed to index providers');
      }

      console.log(`Successfully indexed ${providers.length} providers`);
    } catch (error) {
      console.error('Failed to reindex providers:', error);
      throw error;
    }
  }

  protected async flattenEntity(provider: Provider): Promise<any> {
    // Handle location field - convert PostGIS point to string representation
    let locationString: string | null = null;
    if (provider.location) {
      try {
        // If location is already a string, use it as is
        if (typeof provider.location === 'string') {
          locationString = provider.location;
        } else {
          // If it's a PostGIS point object, convert to string
          locationString = JSON.stringify(provider.location);
        }
      } catch (error) {
        console.warn('Failed to process location field:', error);
        locationString = null;
      }
    }

    return {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      address: provider.address,
      image: provider.image,
      location: locationString,
      storeId: provider.storeId,
      userId: provider.userId,
      contactInfo: provider.contactInfo,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  @Cacheable({
    ttl: 300,
    keyGenerator: (query = '', filters = {}) => {
      const { page = 1, limit = 50, storeId, ...cleanFilters } = filters;
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:providers:store=${storeId}:q=${query}:page=${page}:limit=${limit}:filters:${filtersKey}`;
    },
  })
  async searchEntities(query: string, filters: Record<string, any> = {}) {
    try {
      const { page = 1, limit = 50, storeId, userId, q, ...cleanFilters } = filters;
      const from = (Number(page) - 1) * Number(limit);
    
      const mustFilters: Array<any> = [];
      
      if (storeId) {
        mustFilters.push({ term: { storeId } });
      }

      if (userId) {
        mustFilters.push({ term: { userId } });
      }

      Object.entries(cleanFilters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'q') {
          mustFilters.push({ term: { [key]: val } });
        }
      });
    
      let queryBody: any;
      const searchQuery = q || query;
      
      if (searchQuery?.trim()) {
        queryBody = {
          bool: {
            must: mustFilters,
            should: [
              { wildcard: { 'name.keyword': { value: `*${searchQuery.trim()}*` } } },
              { prefix: { 'name.keyword': { value: searchQuery.trim() } } },
              { match: { name: { query: searchQuery.trim(), fuzziness: 'AUTO' } } },
              { match: { email: { query: searchQuery.trim(), fuzziness: 'AUTO' } } },
              { match: { phoneNumber: { query: searchQuery.trim(), fuzziness: 'AUTO' } } },
              { match: { address: { query: searchQuery.trim(), fuzziness: 'AUTO' } } }
            ],
            minimum_should_match: 1
          }
        };
      } else {
        queryBody = { bool: { must: mustFilters } };
      }
    
      console.log('Search query:', JSON.stringify(queryBody, null, 2));
    
      const response = await this.esService.search({
        index: this.index,
        from,
        size: Number(limit),
        query: queryBody,
        sort: [{ _score: { order: 'desc' } }, { 'name.keyword': { order: 'asc' } }]
      });

      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      const totalPages = Math.ceil(total / Number(limit));

      console.log(`Search results: ${response.hits.hits.length} hits out of ${total} total`);

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
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  async debugIndex() {
    try {
      const indexExists = await this.esService.indices.exists({ index: this.index });
      console.log(`Index ${this.index} exists:`, indexExists);

      if (indexExists) {
        const count = await this.esService.count({ index: this.index });
        console.log(`Document count:`, count);

        const sample = await this.esService.search({
          index: this.index,
          size: 5,
          query: { match_all: {} }
        });
        console.log(`Sample documents:`, sample.hits.hits.map((hit: any) => hit._source));
      }
    } catch (error) {
      console.error('Debug error:', error);
    }
  }

  @CacheEvict({ patternGenerator: (storeId) => `search:providers:*` })
  async reindexByStore(storeId: string): Promise<void> {
    try {
      console.log(`Starting reindex for store ${storeId}...`);
      const providers = await this.providerRepository.find({
        where: { storeId },
      });

      if (providers.length === 0) {
        console.log(`No providers found for store ${storeId}`);
        return;
      }

      console.log(`Found ${providers.length} providers for store ${storeId}`);

      await this.esService.deleteByQuery({
        index: this.index,
        body: { query: { term: { storeId } } }
      });

      const operations: any[] = [];
      for (const provider of providers) {
        const flattenedEntity = await this.flattenEntity(provider);
        operations.push({ index: { _index: this.index, _id: provider.id.toString() } });
        operations.push(flattenedEntity);
      }

      const response = await this.esService.bulk({ body: operations, refresh: true });

      if (response.errors) {
        const errors = response.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error);
        console.error('Bulk indexing errors:', errors);
        throw new Error(`Failed to index providers for store ${storeId}`);
      }

      console.log(`Successfully indexed ${providers.length} providers for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex providers for store ${storeId}:`, error);
      throw error;
    }
  }
} 