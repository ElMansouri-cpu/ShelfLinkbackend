import { Injectable, Optional } from '@nestjs/common';
import { Repository, ObjectLiteral, FindOptionsWhere } from 'typeorm';
import { StoreCrudService } from './store-crud.service';
import { StoresService } from 'src/stores/stores.service';
import { BaseSearchService, SearchableEntity, SearchFilters, SearchResult } from './base-search.service';
import { QueryDto } from '../dto/query.dto';

@Injectable()
export abstract class SearchableStoreCrudService<T extends SearchableEntity> extends StoreCrudService<T> {
  constructor(
    protected readonly repo: Repository<T>,
    protected readonly storesService: StoresService,
    @Optional() protected readonly searchService?: BaseSearchService<T>,
  ) {
    super(repo, storesService);
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
   * Enhanced search using Elasticsearch
   */
  async elasticSearch(
    storeId: string,
    query: string = '',
    filters: SearchFilters = {},
    userId: string,
  ): Promise<SearchResult<T>> {
    if (!this.searchService) {
      throw new Error('Search service not available for this entity');
    }
    
    await this.storesService.findOne(storeId, userId);
    
    return this.searchService.searchEntities(query, { ...filters, storeId });
  }

  async verifyStoreAccess(storeId: string, userId: string): Promise<void> {
    await this.storesService.findOne(storeId, userId);
  }

  async reindexStore(storeId: string): Promise<void> {
    if (!this.searchService) {
      throw new Error('Search service not available');
    }
    await this.searchService.reindexByStore(storeId);
  }
} 