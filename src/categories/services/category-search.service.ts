import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Category } from '../entities/category.entity';
import { CacheEvict, Cacheable } from '../../cache/decorators';

@Injectable()
export class CategorySearchService extends BaseSearchService<Category> {
  protected readonly index = 'categories';
  protected readonly searchFields = [
    'name^3',
    'description^2',
    'store.name^2'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {
    super(esService);
  }

  protected async flattenEntity(category: Category): Promise<any> {
    return {
      id: category.id,
      name: category.name,
      image: category.image,
      description: category.description,
      status: category.status,
      productsCount: category.productsCount,
      parentId: category.parentId,
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
  }

  /**
   * Override searchEntities with category-specific caching
   */
  @Cacheable({
    ttl: 300, // 5 minutes for search results
    keyGenerator: (query = '', filters = {}) => {
      const { page = 1, limit = 50, ...cleanFilters } = filters;
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:categories:${query || 'all'}:page:${page}:limit:${limit}:filters:${filtersKey}`;
    },
  })
  async searchEntities(query: string = '', filters: any = {}): Promise<any> {
    return super.searchEntities(query, filters);
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:categories:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    const categories = await this.categoryRepository.find({
      where: { storeId },
      relations: ['store', 'parent'],
    });

    await this.bulkIndex(categories);
  }
} 