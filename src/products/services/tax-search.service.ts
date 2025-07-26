import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Tax } from '../entities/tax.entity';

@Injectable()
export class TaxSearchService extends BaseSearchService<Tax> implements OnModuleInit {
  protected readonly indexName = 'taxes';
  protected readonly searchFields = ['name'];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      console.log('Initializing tax search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Tax search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize tax search service:', error);
      console.log('Tax search service will be available but may need manual reindexing');
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
                rate: {
                  type: 'float'
                },
                storeId: {
                  type: 'keyword'
                },
                isActive: {
                  type: 'boolean'
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
                      type: 'keyword'
                    },
                    banner: {
                      type: 'keyword'
                    },
                    url: {
                      type: 'keyword'
                    },
                    description: {
                      type: 'text',
                      analyzer: 'autocomplete',
                      search_analyzer: 'standard'
                    },
                    location: {
                      type: 'geo_point'
                    },
                    isPrimary: {
                      type: 'boolean'
                    },
                    productsCount: {
                      type: 'integer'
                    },
                    ordersCount: {
                      type: 'integer'
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

  // --- Aliased/Implemented Generic Methods ---

  /**
   * Index (or update) a tax in Elasticsearch
   */
  async index(tax: Tax) {
    return this.indexEntity(tax);
  }

  /**
   * Search for taxes by store and query/filter
   */
  async search(storeId: string, query: any) {
    const searchQuery = query.q || '';
    const filters = { ...query };
    
    const must: any[] = [
      { term: { storeId } }
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
    if (filters.isActive !== undefined) {
      must.push({ term: { isActive: filters.isActive === 'true' } });
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
   * Find a single tax by store and ID
   */
  async findById(storeId: string, id: string) {
    return super.findById(storeId, id);
  }

  /**
   * Update a tax in Elasticsearch
   */
  async update(tax: Tax) {
    return this.indexEntity(tax);
  }

  /**
   * Remove a tax from Elasticsearch by store and ID
   */
  async remove(storeId: string, id: string) {
    return this.removeEntity(id);
  }

  // --- Entity-specific methods ---

  private async reindexAll() {
    try {
      const taxes = await this.taxRepository.find({
        relations: ['store'],
      });

      if (taxes.length === 0) {
        console.log('No taxes found for reindexing');
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
      for (const tax of taxes) {
        const flattenedEntity = await this.flattenEntity(tax);
        operations.push({ index: { _index: this.indexName, _id: tax.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${taxes.length} taxes`);
      }
    } catch (error) {
      console.error('Failed to reindex taxes:', error);
      throw error;
    }
  }

  protected async flattenEntity(tax: Tax): Promise<any> {
    return {
      id: tax.id,
      name: tax.name,
      rate: tax.rate,
      storeId: tax.storeId,
      isActive: tax.isActive,
      store: tax.store ? {
        id: tax.store.id,
        name: tax.store.name,
        logo: tax.store.logo,
        banner: tax.store.banner,
        url: tax.store.url,
        description: tax.store.description,
        location: tax.store.location,
        isPrimary: tax.store.isPrimary,
        productsCount: tax.store.productsCount,
        ordersCount: tax.store.ordersCount
      } : null,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    };
  }

  async reindexByStore(storeId: string): Promise<void> {
    try {
      const taxes = await this.taxRepository.find({
        where: { storeId },
        relations: ['store'],
      });

      if (taxes.length === 0) {
        console.log(`No taxes found for store ${storeId}`);
        return;
      }

      // Delete existing documents for this store
      await this.esService.deleteByQuery({
        index: this.indexName,
        body: { query: { term: { storeId } } }
      });

      // Index new documents
      const operations: any[] = [];
      for (const tax of taxes) {
        const flattenedEntity = await this.flattenEntity(tax);
        operations.push({ index: { _index: this.indexName, _id: tax.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${taxes.length} taxes for store ${storeId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex taxes for store ${storeId}:`, error);
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