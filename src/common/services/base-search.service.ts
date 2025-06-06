import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ObjectLiteral } from 'typeorm';

export interface SearchableEntity extends ObjectLiteral {
  id: string | number;
  storeId?: string;
  userId?: string;
}

export interface SearchFilters {
  [key: string]: any;
  page?: number;
  limit?: number;
  storeId?: string;
  userId?: string;
}

export interface SearchResult<T> {
  hits: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export abstract class BaseSearchService<T extends SearchableEntity> {
  protected abstract readonly index: string;
  protected abstract readonly searchFields: string[];

  constructor(protected readonly esService: ElasticsearchService) {}

  /**
   * Flatten entity data for Elasticsearch indexing
   * Override this method in entity-specific services
   */
  protected abstract flattenEntity(entity: T): Promise<any> | any;

  /**
   * Index a single entity
   */
  async indexEntity(entity: T): Promise<void> {
    try {
      const flattenedEntity = await this.flattenEntity(entity);
      await this.esService.index({
        index: this.index,
        id: entity.id.toString(),
        document: flattenedEntity,
      });
    } catch (error) {
      console.error(`Failed to index ${this.index} entity ${entity.id}:`, error);
    }
  }

  /**
   * Remove entity from index
   */
  async removeEntity(id: string | number): Promise<void> {
    try {
      await this.esService.delete({
        index: this.index,
        id: id.toString(),
      });
    } catch (error) {
      console.error(`Failed to remove ${this.index} entity ${id}:`, error);
    }
  }

  /**
   * Search entities with query and filters
   */
  async searchEntities(query: string = '', filters: SearchFilters = {}): Promise<SearchResult<any>> {
    const { page = 1, limit = 50, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);

    // Build filter conditions
    const mustFilters = Object.entries(cleanFilters)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        term: { [`${key}.keyword`]: value },
      }));

    // Build search query
    const shouldQuery = query?.trim()
      ? [
          {
            multi_match: {
              query: query.trim(),
              fields: this.searchFields,
              fuzziness: 'AUTO',
              operator: 'or' as const,
            },
          },
        ]
      : [];

    // Construct final query
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
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
    });

    // Handle different response formats
    const total = typeof response.hits.total === 'number' 
      ? response.hits.total 
      : response.hits.total?.value || 0;

    return {
      hits: response.hits.hits.map((hit: any) => hit._source),
      total,
      page: Number(page),
      limit: Number(limit),
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

    const body: any[] = [];
    for (const entity of entities) {
      const flattenedEntity = await this.flattenEntity(entity);
      body.push({ index: { _index: this.index, _id: entity.id.toString() } });
      body.push(flattenedEntity);
    }

    try {
      await this.esService.bulk({ body });
    } catch (error) {
      console.error(`Failed to bulk index ${this.index} entities:`, error);
    }
  }
} 