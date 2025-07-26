import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../entities/store.entity';
import { BaseSearchService } from '../../common/services/base-search.service';

@Injectable()
export class StoreSearchService extends BaseSearchService<Store> implements OnModuleInit {
  protected readonly indexName = 'stores';
  protected readonly searchFields = ['name', 'description', 'url'];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      console.log('Initializing store search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Store search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize store search service:', error);
      console.log('Store search service will be available but may need manual reindexing');
    }
  }

  public async createIndexIfNotExists() {
    try {
      const indexExists = await this.esService.indices.exists({ index: this.indexName });
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
                    filter: ['lowercase', 'autocomplete_filter']
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                },
                description: {
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
                image: { type: 'text' },
                location: { type: 'text' },
                userId: { type: 'keyword' },
                status: { type: 'keyword' },
                settings: { type: 'object' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
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

  // --- Aliased/Implemented Generic Methods ---

  /**
   * Index (or update) a store in Elasticsearch
   */
  async index(store: Store) {
    return this.indexEntity(store);
  }

  /**
   * Search for stores by user and query/filter
   */
  async search(userId: string, query: any) {
    // Implement custom search logic for stores
    const searchQuery = query.q || '';
    const filters = { ...query, userId };
    
    const must: any[] = [
      { term: { userId } }
    ];

    if (searchQuery) {
      must.push({
        multi_match: {
          query: searchQuery,
          fields: this.searchFields,
          fuzziness: 'AUTO'
        }
      });
    }

    // Add additional filters
    if (filters.status) {
      must.push({ term: { status: filters.status } });
    }

    const response = await this.esService.search({
      index: this.indexName,
      body: {
        query: {
          bool: { must }
        },
        sort: [{ createdAt: { order: 'desc' } }]
      }
    });

    return {
      hits: response.hits.hits.map((hit: any) => hit._source),
      total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0
    };
  }

  /**
   * Find a single store by user and ID
   */
  async findById(userId: string, id: string) {
    // Optionally, you can add a userId filter for extra safety
    return super.findById(userId, id);
  }

  /**
   * Update a store in Elasticsearch
   */
  async update(store: Store) {
    return this.indexEntity(store);
  }

  /**
   * Remove a store from Elasticsearch by user and ID
   */
  async remove(userId: string, id: string) {
    return this.removeEntity(id);
  }

  // --- Entity-Specific Methods ---

  private async reindexAll() {
    try {
      const stores = await this.storeRepository.find({
        relations: ['user'],
      });

      if (stores.length === 0) {
        console.log('No stores found for reindexing');
        return;
      }

      // Delete existing index if it exists
      try {
        await this.esService.indices.delete({ index: this.indexName });
        console.log(`Deleted existing index ${this.indexName}`);
      } catch (error) {
        // Ignore error if index doesn't exist
      }

      await this.createIndexIfNotExists();
      console.log(`Created fresh index ${this.indexName}`);

      const operations: any[] = [];
      for (const store of stores) {
        const flattenedEntity = await this.flattenEntity(store);
        operations.push({ index: { _index: this.indexName, _id: store.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${stores.length} stores`);
      }
    } catch (error) {
      console.error('Failed to reindex stores:', error);
      throw error;
    }
  }

  protected async flattenEntity(store: Store): Promise<any> {
    return {
      id: store.id,
      name: store.name,
      description: store.description,
      logo: store.logo,
      banner: store.banner,
      url: store.url,
      location: store.location,
      isPrimary: store.isPrimary,
      productsCount: store.productsCount,
      ordersCount: store.ordersCount,
      lastActive: store.lastActive,
      status: store.status,
      userId: store.userId,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  async reindexByUser(userId: string): Promise<void> {
    try {
      const stores = await this.storeRepository.find({
        where: { userId },
        relations: ['user'],
      });

      // Delete existing documents for this user
      await this.esService.deleteByQuery({
        index: this.indexName,
        body: { query: { term: { userId } } }
      });

      // Index new documents
      const operations: any[] = [];
      for (const store of stores) {
        const flattenedEntity = await this.flattenEntity(store);
        operations.push({ index: { _index: this.indexName, _id: store.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${stores.length} stores for user ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex stores for user ${userId}:`, error);
      throw error;
    }
  }

  async debugIndex() {
    try {
      const indexExists = await this.esService.indices.exists({ index: this.indexName });
      console.log(`Index ${this.indexName} exists:`, indexExists);

      if (indexExists) {
        const count = await this.esService.count({ index: this.indexName });
        console.log(`Document count:`, count);

        const sample = await this.esService.search({
          index: this.indexName,
          size: 5,
          query: { match_all: {} }
        });
        console.log(`Sample documents:`, sample.hits.hits.map(hit => hit._source));
      }
    } catch (error) {
      console.error('Failed to debug index:', error);
    }
  }
} 