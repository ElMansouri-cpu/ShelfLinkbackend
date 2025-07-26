import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class UnitSearchService extends BaseSearchService<Unit> implements OnModuleInit {
  protected readonly indexName = 'units';
  protected readonly searchFields = ['name', 'description'];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      console.log('Initializing unit search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Unit search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize unit search service:', error);
      console.log('Unit search service will be available but may need manual reindexing');
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
                storeId: {
                  type: 'keyword'
                },
                isActive: {
                  type: 'boolean'
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
   * Index (or update) a unit in Elasticsearch
   */
  async index(unit: Unit) {
    return this.indexEntity(unit);
  }

  /**
   * Search for units by store and query/filter
   */
  async search(storeId: string, query: any) {
    // Implement custom search logic for units
    const searchQuery = query.q || '';
    const filters = { ...query, storeId };
    
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
      must.push({ term: { isActive: filters.isActive } });
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
   * Find a single unit by store and ID
   */
  async findById(storeId: string, id: string) {
    return super.findById(storeId, id);
  }

  /**
   * Update a unit in Elasticsearch
   */
  async update(unit: Unit) {
    return this.indexEntity(unit);
  }

  /**
   * Remove a unit from Elasticsearch by store and ID
   */
  async remove(storeId: string, id: string) {
    return this.removeEntity(id);
  }

  // --- Entity-Specific Methods ---

  private async reindexAll() {
    try {
      const units = await this.unitRepository.find({
        relations: [],
      });

      if (units.length === 0) {
        console.log('No units found for reindexing');
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
      for (const unit of units) {
        const flattenedEntity = await this.flattenEntity(unit);
        operations.push({ index: { _index: this.indexName, _id: unit.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${units.length} units`);
      }
    } catch (error) {
      console.error('Failed to reindex units:', error);
      throw error;
    }
  }

  protected async flattenEntity(unit: Unit): Promise<any> {
    return {
      id: unit.id,
      name: unit.name,
      description: unit.description,
      storeId: unit.storeId,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  async reindexByStore(storeId: string): Promise<void> {
    try {
      const units = await this.unitRepository.find({
        where: { storeId },
        relations: [],
      });

      // Delete existing documents for this store
      await this.esService.deleteByQuery({
        index: this.indexName,
        body: { query: { term: { storeId } } }
      });

      // Index new documents
      const operations: any[] = [];
      for (const unit of units) {
        const flattenedEntity = await this.flattenEntity(unit);
        operations.push({ index: { _index: this.indexName, _id: unit.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${units.length} units for store ${storeId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex units for store ${storeId}:`, error);
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