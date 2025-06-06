import { Injectable, Optional } from '@nestjs/common';
import { Repository, ObjectLiteral, FindOptionsWhere } from 'typeorm';
import { BaseCrudService } from './base-crud.service';
import { BaseSearchService, SearchableEntity, SearchFilters, SearchResult } from './base-search.service';

@Injectable()
export abstract class SearchableCrudService<T extends SearchableEntity> extends BaseCrudService<T> {
  constructor(
    protected readonly repo: Repository<T>,
    @Optional() protected readonly searchService?: BaseSearchService<T>,
  ) {
    super(repo);
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = await super.create(data);
    
    // Index in Elasticsearch if search service is available
    if (this.searchService) {
      await this.searchService.indexEntity(entity);
    }
    
    return entity;
  }

  async update(
    id: number | string,
    data: Partial<T>,
    whereExtra: FindOptionsWhere<T> = {},
  ): Promise<T> {
    const entity = await super.update(id, data, whereExtra);
    
    // Reindex in Elasticsearch if search service is available
    if (this.searchService) {
      await this.searchService.indexEntity(entity);
    }
    
    return entity;
  }

  async remove(id: number | string, whereExtra: FindOptionsWhere<T> = {}): Promise<void> {
    await super.remove(id, whereExtra);
    
    // Remove from Elasticsearch if search service is available
    if (this.searchService) {
      await this.searchService.removeEntity(id);
    }
  }

  /**
   * Search entities using Elasticsearch
   */
  async searchEntities(query: string = '', filters: SearchFilters = {}): Promise<SearchResult<T>> {
    if (!this.searchService) {
      throw new Error('Search service not available for this entity');
    }
    
    return this.searchService.searchEntities(query, filters);
  }
} 