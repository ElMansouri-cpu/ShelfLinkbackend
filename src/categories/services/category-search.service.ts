import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Category } from '../entities/category.entity';
import { CacheEvict, Cacheable } from '../../cache/decorators';

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
      // Don't throw error to prevent server crash, just log it
      console.log('Category search service will be available but may need manual reindexing');
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
                image: {
                  type: 'text',
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
                parentId: {
                  type: 'long'
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
                parent: {
                  properties: {
                    id: {
                      type: 'long'
                    },
                    name: {
                      type: 'text',
                      fields: {
                        keyword: {
                          type: 'keyword',
                          ignore_above: 256
                        }
                      }
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
        console.log(`Created index ${this.index} with proper mapping`);
      }
    } catch (error) {
      console.error(`Failed to create index ${this.index}:`, error);
      throw error;
    }
  }

  private async reindexAll() {
    try {
      console.log('Starting reindex of all categories...');
      
      // First check if there are any categories in the database
      const totalCategories = await this.categoryRepository.count();
      console.log(`Total categories in database: ${totalCategories}`);
      
      if (totalCategories === 0) {
        console.log('No categories found in database, skipping reindex');
        return;
      }
      
      const categories = await this.categoryRepository.find({
        relations: ['store', 'parent'],
      });
      
      console.log(`Found ${categories.length} categories to index`);
      
      // Log some sample categories for debugging
      if (categories.length > 0) {
        console.log('Sample categories:', categories.slice(0, 3).map(cat => ({
          id: cat.id,
          name: cat.name,
          status: cat.status,
          storeId: cat.storeId,
          store: cat.store?.name
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
    const flattened = {
      id: category.id,
      name: category.name,
      image: category.image,
      description: category.description,
      status: category.status,
      productsCount: category.productsCount,
      parentId: category.parentId, // This can be null for root categories
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

    // Debug logging to see what's being indexed
    console.log(`Flattening category ${category.id}:`, {
      id: flattened.id,
      name: flattened.name,
      parentId: flattened.parentId,
      hasParent: !!category.parent,
      parentName: category.parent?.name
    });

    return flattened;
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
    try {
      const { page = 1, limit = 50, storeId, status, parentId, q, ...cleanFilters } = filters;
      const from = (Number(page) - 1) * Number(limit);
    
      // Build filter conditions
      const mustFilters: Array<any> = [];
      
      // Add store filter if provided
      if (storeId) {
        mustFilters.push({ term: { storeId } });
      }

      // Add status filter if provided
      if (status) {
        mustFilters.push({ term: { status } });
      }

      // Add parentId filter if provided
      if (parentId !== undefined && parentId !== null) {
        if (parentId === 'null' || parentId === '') {
          // Filter for root categories (no parent)
          mustFilters.push({ bool: { must_not: { exists: { field: 'parentId' } } } });
        } else {
          // Filter for specific parent
          mustFilters.push({ term: { parentId: Number(parentId) } });
        }
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
              },
              // Match in store name
              {
                match: {
                  'store.name': {
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

  // Debug method to check categories by store
  async debugCategoriesByStore(storeId: string) {
    try {
      console.log(`Checking categories for store ${storeId}...`);
      
      // Check database
      const dbCategories = await this.categoryRepository.find({
        where: { storeId },
        relations: ['store', 'parent'],
      });
      console.log(`Categories in database for store ${storeId}:`, dbCategories.length);
      
      if (dbCategories.length > 0) {
        console.log('Sample database categories:', dbCategories.slice(0, 3).map(cat => ({
          id: cat.id,
          name: cat.name,
          status: cat.status,
          storeId: cat.storeId,
          parentId: cat.parentId,
          store: cat.store?.name,
          parent: cat.parent?.name
        })));
      }
      
      // Check Elasticsearch
      try {
        const esCategories = await this.esService.search({
          index: this.index,
          size: 10,
          query: {
            term: { storeId }
          }
        });
        console.log(`Categories in Elasticsearch for store ${storeId}:`, esCategories.hits.total);
        
        if (esCategories.hits.hits.length > 0) {
          console.log('Sample ES categories:', esCategories.hits.hits.slice(0, 3).map((hit: any) => hit._source));
        }
      } catch (error) {
        console.log('Elasticsearch query failed:', error.message);
      }
      
    } catch (error) {
      console.error('Debug categories by store error:', error);
    }
  }

  // Debug method specifically for parentId indexing
  async debugParentIdIndexing(storeId: string) {
    try {
      console.log(`\n🔍 Debugging parentId indexing for store ${storeId}...`);
      
      // Get categories from database
      const dbCategories = await this.categoryRepository.find({
        where: { storeId },
        relations: ['store', 'parent'],
        order: { id: 'ASC' }
      });
      
      console.log(`\n📊 Database categories (${dbCategories.length}):`);
      dbCategories.forEach(cat => {
        console.log(`  ID: ${cat.id}, Name: ${cat.name}, ParentID: ${cat.parentId}, Parent: ${cat.parent?.name || 'None'}`);
      });
      
      // Get categories from Elasticsearch
      try {
        const esResponse = await this.esService.search({
          index: this.index,
          size: 100,
          query: {
            term: { storeId }
          },
          sort: [{ id: { order: 'asc' } }]
        });
        
        console.log(`\n🔍 Elasticsearch categories (${esResponse.hits.total}):`);
        esResponse.hits.hits.forEach((hit: any) => {
          const source = hit._source;
          console.log(`  ID: ${source.id}, Name: ${source.name}, ParentID: ${source.parentId}, Parent: ${source.parent?.name || 'None'}`);
        });
        
        // Compare parentId values
        console.log(`\n📋 ParentId comparison:`);
        const dbParentIds = dbCategories.map(cat => ({ id: cat.id, parentId: cat.parentId }));
        const esParentIds = esResponse.hits.hits.map((hit: any) => ({ id: hit._source.id, parentId: hit._source.parentId }));
        
        const mismatches: Array<{ id: number; dbParentId: number | null; esParentId: number | null }> = [];
        dbParentIds.forEach(dbCat => {
          const esCat = esParentIds.find(es => es.id === dbCat.id);
          if (!esCat || esCat.parentId !== dbCat.parentId) {
            mismatches.push({
              id: dbCat.id,
              dbParentId: dbCat.parentId,
              esParentId: esCat?.parentId
            });
          }
        });
        
        if (mismatches.length > 0) {
          console.log(`❌ Found ${mismatches.length} parentId mismatches:`);
          mismatches.forEach(mismatch => {
            console.log(`  ID ${mismatch.id}: DB=${mismatch.dbParentId}, ES=${mismatch.esParentId}`);
          });
        } else {
          console.log(`✅ All parentId values match between database and Elasticsearch`);
        }
        
      } catch (error) {
        console.log('Elasticsearch query failed:', error.message);
      }
      
    } catch (error) {
      console.error('Debug parentId indexing error:', error);
    }
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