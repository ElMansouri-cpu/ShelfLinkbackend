import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Unit } from '../entities/unit.entity';
import { CacheEvict, Cacheable } from '../../cache/decorators';

@Injectable()
export class UnitSearchService extends BaseSearchService<Unit> implements OnModuleInit {
  protected readonly index = 'units';
  protected readonly searchFields = [
    'name',
    'description'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {
    super(esService);
  }

  async onModuleInit() {
    try {
      console.log('Initializing unit search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Unit search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize unit search service:', error);
      // Don't throw error to prevent server crash, just log it
      console.log('Unit search service will be available but may need manual reindexing');
    }
  }

  protected async createIndexIfNotExists() {
    try {
      const indexExists = await this.esService.indices.exists({
        index: this.index
      });

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
        console.log(`Created index ${this.index} with proper mapping`);
      }
    } catch (error) {
      console.error(`Failed to create index ${this.index}:`, error);
      throw error;
    }
  }

  private async reindexAll() {
    try {
      console.log('Starting reindex of all units...');
      
      // First check if there are any units in the database
      const totalUnits = await this.unitRepository.count();
      console.log(`Total units in database: ${totalUnits}`);
      
      if (totalUnits === 0) {
        console.log('No units found in database, skipping reindex');
        return;
      }
      
      const units = await this.unitRepository.find();
      
      console.log(`Found ${units.length} units to index`);
      
      // Log some sample units for debugging
      if (units.length > 0) {
        console.log('Sample units:', units.slice(0, 3).map(unit => ({
          id: unit.id,
          name: unit.name,
          isActive: unit.isActive,
          storeId: unit.storeId
        })));
      }
      
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

      // Index all units
      const operations: any[] = [];
      for (const unit of units) {
        const flattenedEntity = await this.flattenEntity(unit);
        operations.push({ index: { _index: this.index, _id: unit.id.toString() } });
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
        throw new Error('Failed to index units');
      }

      console.log(`Successfully indexed ${units.length} units`);
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

  @Cacheable({
    ttl: 300,
    keyGenerator: (query = '', filters = {}) => {
      const { page = 1, limit = 50, storeId, ...cleanFilters } = filters;
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:units:store=${storeId}:q=${query}:page=${page}:limit=${limit}:filters:${filtersKey}`;
    },
  })
  async searchEntities(query: string, filters: Record<string, any> = {}) {
    try {
      const { page = 1, limit = 50, storeId, isActive, q, ...cleanFilters } = filters;
      const from = (Number(page) - 1) * Number(limit);
    
      // Build filter conditions
      const mustFilters: Array<any> = [];
      
      // Add store filter if provided
      if (storeId) {
        mustFilters.push({ term: { storeId } });
      }

      // Add isActive filter if provided
      if (isActive !== undefined) {
        mustFilters.push({ term: { isActive: Boolean(isActive) } });
      }

      // Add other filters (excluding q which is the query parameter)
      Object.entries(cleanFilters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'q') {
          mustFilters.push({ term: { [key]: val } });
        }
      });
    
      // Build search query
      let queryBody: any;
      
      // Use the query parameter from filters if provided, otherwise use the query parameter
      const searchQuery = q || query;
      
      if (searchQuery?.trim()) {
        // Text search with filters
        queryBody = {
          bool: {
            must: mustFilters,
            should: [
              // Exact match with wildcards
              {
                wildcard: { 
                  'name.keyword': { 
                    value: `*${searchQuery.trim()}*` 
                  } 
                }
              },
              // Prefix match
              {
                prefix: {
                  'name.keyword': {
                    value: searchQuery.trim()
                  }
                }
              },
              // Fuzzy match for name
              {
                match: {
                  name: {
                    query: searchQuery.trim(),
                    fuzziness: 'AUTO'
                  }
                }
              },
              // Match in description
              {
                match: {
                  description: {
                    query: searchQuery.trim(),
                    fuzziness: 'AUTO'
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };
      } else {
        // No text search, just filters
        queryBody = {
          bool: {
            must: mustFilters
          }
        };
      }
    
      console.log('Search query:', JSON.stringify(queryBody, null, 2));
      console.log('Search filters:', JSON.stringify(filters, null, 2));
    
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

  // Debug method to check index status
  async debugIndex() {
    try {
      // Check if index exists
      const indexExists = await this.esService.indices.exists({ index: this.index });
      console.log(`Index ${this.index} exists:`, indexExists);

      if (indexExists) {
        // Get index stats
        const stats = await this.esService.indices.stats({ index: this.index });
        console.log(`Index stats:`, stats);

        // Get mapping
        const mapping = await this.esService.indices.getMapping({ index: this.index });
        console.log(`Index mapping:`, mapping);

        // Count documents
        const count = await this.esService.count({ index: this.index });
        console.log(`Document count:`, count);

        // Get a few sample documents
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

  // Debug method to check units by store
  async debugCategoriesByStore(storeId: string) {
    try {
      console.log(`Checking units for store ${storeId}...`);
      
      // Check database
      const dbUnits = await this.unitRepository.find({
        where: { storeId },
      });
      console.log(`Units in database for store ${storeId}:`, dbUnits.length);
      
      if (dbUnits.length > 0) {
        console.log('Sample database units:', dbUnits.slice(0, 3).map(unit => ({
          id: unit.id,
          name: unit.name,
          isActive: unit.isActive,
          storeId: unit.storeId
        })));
      }
      
      // Check Elasticsearch
      try {
        const esUnits = await this.esService.search({
          index: this.index,
          size: 10,
          query: {
            term: { storeId }
          }
        });
        console.log(`Units in Elasticsearch for store ${storeId}:`, esUnits.hits.total);
        
        if (esUnits.hits.hits.length > 0) {
          console.log('Sample ES units:', esUnits.hits.hits.slice(0, 3).map((hit: any) => hit._source));
        }
      } catch (error) {
        console.log('Elasticsearch query failed:', error.message);
      }
      
    } catch (error) {
      console.error('Debug units by store error:', error);
    }
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:units:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    try {
      console.log(`Starting reindex for store ${storeId}...`);
      const units = await this.unitRepository.find({
        where: { storeId },
      });

      if (units.length === 0) {
        console.log(`No units found for store ${storeId}`);
        return;
      }

      console.log(`Found ${units.length} units for store ${storeId}`);

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
      for (const unit of units) {
        const flattenedEntity = await this.flattenEntity(unit);
        operations.push({ index: { _index: this.index, _id: unit.id.toString() } });
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
        throw new Error(`Failed to index units for store ${storeId}`);
      }

      console.log(`Successfully indexed ${units.length} units for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex units for store ${storeId}:`, error);
      throw error;
    }
  }
} 