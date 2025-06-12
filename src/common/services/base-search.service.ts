import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ObjectLiteral } from 'typeorm';
import { QueryDslOperator, QueryDslTextQueryType } from '@elastic/elasticsearch/lib/api/types';

export interface SearchableEntity extends ObjectLiteral {
  id: string | number;
  storeId?: string;
  userId?: string;
}

export interface SearchFilters {
  [key: string]: any;
  page?: number;
  limit?: number;
  q?: number;
  storeId?: string;
  userId?: string;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface SearchResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export abstract class BaseSearchService<T extends SearchableEntity> {
  protected abstract readonly index: string;
  protected abstract readonly searchFields: string[];
  protected readonly defaultSort = { field: 'createdAt', order: 'desc' as const };

  constructor(protected readonly esService: ElasticsearchService) {}

  protected async createIndexIfNotExists() {
    if (!this.index) {
      console.warn('Index name is not defined, skipping index creation');
      return;
    }

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
                username: {
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
                email: {
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
                  type: 'keyword'
                },
                storeId: {
                  type: 'keyword'
                },
                subscriptionTier: {
                  type: 'keyword'
                },
                storeLimit: {
                  type: 'integer'
                },
                user_metadata: {
                  type: 'object'
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
      }
    } catch (error) {
      console.error(`Failed to create index ${this.index}:`, error);
    }
  }

  /**
   * Flatten entity data for Elasticsearch indexing
   * Override this method in entity-specific services
   */
  protected abstract flattenEntity(entity: T): Promise<any> | any;

  protected getIndexName(): string {
    if (!this.index) {
      throw new Error('Index name is not defined');
    }
    return this.index;
  }

  /**
   * Index a single entity
   */
  async indexEntity(entity: T): Promise<void> {
    try {
      const flattenedEntity = await this.flattenEntity(entity);
      await this.esService.index({
        index: this.getIndexName(),
        id: entity.id.toString(),
        document: flattenedEntity,
      });
    } catch (error) {
      console.error(`Failed to index ${this.getIndexName()} entity ${entity.id}:`, error);
    }
  }

  /**
   * Remove entity from index
   */
  async removeEntity(id: string | number): Promise<void> {
    try {
      await this.esService.delete({
        index: this.getIndexName(),
        id: id.toString(),
      });
    } catch (error) {
      console.error(`Failed to remove ${this.getIndexName()} entity ${id}:`, error);
    }
  }

  /**
   * Search entities
   */
  async searchEntities(query: string = '', filters: SearchFilters = {}): Promise<SearchResult<any>> {
    const { page = 1, limit = 50, q, sort = this.defaultSort, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);

    // Build filter conditions
    const mustFilters = Object.entries(cleanFilters)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return { term: { [key]: value } };
        }
        if (typeof value === 'number') {
          return { term: { [key]: value } };
        }
        if (Array.isArray(value)) {
          return { terms: { [key]: value } };
        }
        return { match: { [key]: value } };
      });

    // Build search query with improved text search
    const shouldQuery = query?.trim()
      ? [
          {
            multi_match: {
              query: query.trim(),
              fields: this.searchFields!.map(field => `${field}^3`),
              type: 'best_fields' as QueryDslTextQueryType,
              operator: 'and' as QueryDslOperator,
              boost: 2,
            },
          },
          {
            multi_match: {
              query: query.trim(),
              fields: this.searchFields!,
              type: 'best_fields' as QueryDslTextQueryType,
              operator: 'or' as QueryDslOperator,
              fuzziness: 'AUTO',
              prefix_length: 2,
              tie_breaker: 0.3,
            },
          },
          {
            multi_match: {
              query: query.trim(),
              fields: this.searchFields!,
              type: 'phrase' as QueryDslTextQueryType,
              slop: 2,
            },
          },
          {
            multi_match: {
              query: query.trim(),
              fields: this.searchFields!,
              type: 'phrase_prefix' as QueryDslTextQueryType,
              slop: 2,
            },
          },
        ]
      : [];

    const queryBody = shouldQuery.length
      ? {
          bool: {
            should: shouldQuery,
            filter: mustFilters,
            minimum_should_match: 1,
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
      index: this.getIndexName(),
      from,
      size: Number(limit),
      sort: [{ [sort.field]: sort.order }],
      query: queryBody,
      track_total_hits: true,
    });

    // Safely handle total hits count
    let total = 0;
    if (typeof response.hits.total === 'number') {
      total = response.hits.total;
    } else if (response.hits.total && typeof response.hits.total.value === 'number') {
      total = response.hits.total.value;
    }

    return {
      data: response.hits.hits.map((hit: any) => hit._source),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPreviousPage: Number(page) > 1,
      },
    };
  }

  /**
   * Reindex entities by store ID
   */
  abstract reindexByStore(storeId: string): Promise<void>;

  /**
   * Reindex entities by user ID (if applicable)
   */
  async reindexByUser?(userId: string): Promise<void>;

  /**
   * Bulk index entities
   */
  async bulkIndex(entities: T[]): Promise<void> {
    if (entities.length === 0) return;

    try {
      console.log(`Starting bulk indexing ${entities.length} entities for index ${this.index}...`);
      
      const body: any[] = [];
      for (const entity of entities) {
        const flattenedEntity = await this.flattenEntity(entity);
        body.push({ index: { _index: this.getIndexName(), _id: entity.id.toString() } });
        body.push(flattenedEntity);
      }

      const response = await this.esService.bulk({ 
        body,
        refresh: true
      });

      if (response.errors) {
        const errors = response.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error);
        console.error(`Bulk indexing errors for ${this.index}:`, errors);
      } else {
        console.log(`Successfully bulk indexed ${entities.length} entities for index ${this.index}`);
      }
    } catch (error) {
      console.error(`Failed to bulk index ${this.index} entities:`, error);
      throw error;
    }
  }

  protected async recreateIndex() {
    const indexExists = await this.esService.indices.exists({
      index: this.getIndexName()
    });

    if (indexExists) {
      await this.esService.indices.delete({
        index: this.getIndexName()
      });
    }

    await this.createIndexIfNotExists();
  }
} 