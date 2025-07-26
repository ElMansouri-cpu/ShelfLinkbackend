import { ISearchService } from '../interfaces/search-service.interface';

// --- Interfaces for backward compatibility ---

export interface SearchableEntity {
  id: string;
  [key: string]: any;
}

export interface SearchFilters {
  storeId?: string;
  [key: string]: any;
}

export interface SearchResult<T> {
  hits?: T[];
  total?: number;
  data?: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  page?: number;
  limit?: number;
  totalPages?: number;
}

export abstract class BaseSearchService<T> implements ISearchService<T> {
  protected abstract readonly indexName: string;
  protected abstract readonly searchFields: string[];
  protected abstract flattenEntity(entity: T): Promise<any>;
  protected abstract esService: any;

  async index(entity: T): Promise<any> {
    const body = await this.flattenEntity(entity);
    return this.esService.index({
      index: this.indexName,
      id: body.id,
      document: body,
    });
  }

  async search(storeId: string, query: any): Promise<any> {
    // To be implemented by subclass if needed for custom logic
    throw new Error('search() not implemented');
  }

  async findById(storeId: string, id: string): Promise<T | null> {
    try {
      const result = await this.esService.get({
        index: this.indexName,
        id,
      });
      if (result.found) {
        return result._source as T;
      }
      return null;
    } catch (error) {
      if (error.meta && error.meta.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(entity: T): Promise<any> {
    const body = await this.flattenEntity(entity);
    return this.esService.update({
      index: this.indexName,
      id: body.id,
      doc: body,
    });
  }

  async remove(storeId: string, id: string): Promise<any> {
    return this.esService.delete({
      index: this.indexName,
      id,
    });
  }

  // --- Utility methods for entity search services ---

  /**
   * Index a single entity (alias for index)
   */
  async indexEntity(entity: T): Promise<any> {
    return this.index(entity);
  }

  /**
   * Remove an entity from the index
   */
  async removeEntity(id: string | number): Promise<any> {
    // Convert number to string if needed
    const stringId = typeof id === 'number' ? id.toString() : id;
    return this.esService.delete({
      index: this.indexName,
      id: stringId,
    });
  }

  /**
   * Bulk index entities
   */
  async bulkIndex(entities: T[]): Promise<void> {
    if (!entities.length) return;
    const body: any[] = [];
    for (const entity of entities) {
      const flattened = await this.flattenEntity(entity);
      body.push({ index: { _index: this.indexName, _id: flattened.id } });
      body.push(flattened);
    }
    const response = await this.esService.bulk({ body, refresh: true });
    if (response.errors) {
      const errors = response.items.filter((item: any) => item.index?.error).map((item: any) => item.index.error);
      // Optionally log errors
      // console.error(`Bulk indexing errors for ${this.indexName}:`, errors);
    }
  }

  /**
   * Create the index if it does not exist
   */
  async createIndexIfNotExists(): Promise<void> {
    if (!this.indexName) {
      throw new Error('indexName must be defined');
    }

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
            }
          }
        });
      }
    } catch (error) {
      console.error(`Failed to create index ${this.indexName}:`, error);
      throw error;
    }
  }

  /**
   * Search entities with query and filters (for backward compatibility)
   * This method can be overridden by subclasses to return different formats
   */
  async searchEntities(query: string, filters: SearchFilters = {}): Promise<SearchResult<T>> {
    const must: any[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: this.searchFields,
          fuzziness: 'AUTO'
        }
      });
    }

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        must.push({ term: { [key]: value } });
      }
    });

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
   * Reindex by store (for backward compatibility)
   */
  async reindexByStore(storeId: string): Promise<void> {
    // This should be implemented by subclasses that need store-specific reindexing
    throw new Error('reindexByStore() not implemented');
  }
} 