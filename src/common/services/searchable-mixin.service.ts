import { Optional } from '@nestjs/common';
import { BaseSearchService, SearchableEntity, SearchFilters, SearchResult } from './base-search.service';

export interface SearchableMixin<T extends SearchableEntity> {
  searchService?: BaseSearchService<T>;
  indexEntity?(entity: T): Promise<void>;
  removeEntityFromIndex?(id: string | number): Promise<void>;
  elasticSearch?(storeId: string, query: string, filters: SearchFilters, userId: string): Promise<SearchResult<T>>;
}

export function withSearch<T extends SearchableEntity>(
  searchService?: BaseSearchService<T>
): SearchableMixin<T> {
  return {
    searchService,
    
    async indexEntity(entity: T): Promise<void> {
      if (searchService) {
        await searchService.indexEntity(entity);
      }
    },
    
    async removeEntityFromIndex(id: string | number): Promise<void> {
      if (searchService) {
        await searchService.removeEntity(id);
      }
    },
    
    async elasticSearch(
      storeId: string,
      query: string = '',
      filters: SearchFilters = {},
      userId: string,
    ): Promise<SearchResult<T>> {
      if (!searchService) {
        throw new Error('Search service not available for this entity');
      }
      
      return searchService.searchEntities(query, { ...filters, storeId });
    }
  };
} 