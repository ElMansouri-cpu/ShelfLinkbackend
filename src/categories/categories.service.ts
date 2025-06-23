import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StoreCrudService } from 'src/common/services/store-crud.service';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { StoresService } from '../stores/stores.service';
import { Cacheable, CacheEvict, CachePatterns } from '../cache/decorators';
import { CategorySearchService } from './services/category-search.service';

@Injectable()
export class CategoriesService extends StoreCrudService<Category> {
  protected readonly alias = 'categorie';
  protected readonly searchColumns: (keyof Category)[] = ['name', 'description'];

  constructor(
    @InjectRepository(Category) repo: Repository<Category>,
    storesService: StoresService,
    private readonly categorySearchService: CategorySearchService,
  ) {
    super(repo, storesService);
  }

  /**
   * Override create with cache invalidation and Elasticsearch indexing
   * Invalidates store category caches when new category is created
   */
  @CacheEvict({
    patternGenerator: (data) => `store:${data.storeId}:categories*`,
  })
  async create(data: Partial<Category>): Promise<Category> {
    const category = await super.create(data);
    
    // Index the new category in Elasticsearch
    try {
      // Load relations needed for indexing
      const categoryWithRelations = await this.repo.findOne({
        where: { id: category.id },
        relations: ['store', 'parent'],
      });
      
      if (categoryWithRelations) {
        await this.categorySearchService.indexEntity(categoryWithRelations);
        console.log(`Indexed new category ${category.id} in Elasticsearch`);
      }
    } catch (error) {
      console.error(`Failed to index new category ${category.id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return category;
  }

  /**
   * Override update with cache invalidation and Elasticsearch indexing
   * Invalidates specific category and store category caches
   */
  @CacheEvict({
    patternGenerator: (id, data) => `category:${id}*`,
  })
  async update(id: string | number, data: Partial<Category>): Promise<Category> {
    const category = await super.update(id, data);
    
    // Re-index the updated category in Elasticsearch
    try {
      // Load relations needed for indexing
      const categoryWithRelations = await this.repo.findOne({
        where: { id: category.id },
        relations: ['store', 'parent'],
      });
      
      if (categoryWithRelations) {
        await this.categorySearchService.indexEntity(categoryWithRelations);
        console.log(`Re-indexed updated category ${id} in Elasticsearch`);
      }
    } catch (error) {
      console.error(`Failed to re-index updated category ${id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return category;
  }

  /**
   * Override remove with cache invalidation and Elasticsearch indexing
   */
  @CacheEvict({
    patternGenerator: (id) => `category:${id}*`,
  })
  async remove(id: string | number): Promise<void> {
    await super.remove(id);
    
    // Remove the category from Elasticsearch index
    try {
      await this.categorySearchService.removeEntity(id);
      console.log(`Removed category ${id} from Elasticsearch index`);
    } catch (error) {
      console.error(`Failed to remove category ${id} from Elasticsearch:`, error);
      // Don't throw error to prevent transaction rollback
    }
  }

  /**
   * Get categories by store with caching (10 minutes TTL)
   * Categories don't change frequently, so longer cache
   */
  @Cacheable(CachePatterns.Store((storeId) => `store:${storeId}:categories`))
  async findByStore(storeId: string): Promise<Category[]> {
    return this.repo.find({
      where: { storeId },
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get single category with relations and caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (id, storeId) => `category:${id}:store:${storeId}:full`,
  })
  async findOneWithRelations(id: string | number, storeId?: string): Promise<Category> {
    const where: any = { id };
    if (storeId) where.storeId = storeId;

    const category = await this.repo.findOne({
      where,
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Get category products with caching (5 minutes TTL)
   * Product listings change more frequently
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (id) => `category:${id}:products`,
  })
  async getProducts(id: string) {
    const category = await this.repo
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.variants', 'variant', 'variant.isActive = :isActive', { isActive: true })
      .where('category.id = :id', { id: Number(id) })
      .getOne();
  
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  
    return category.variants;
  }

  /**
   * Get root categories (no parent) with caching
   */
  @Cacheable({
    ttl: 900, // 15 minutes
    keyGenerator: (storeId) => `store:${storeId}:categories:root`,
  })
  async getRootCategories(storeId: string): Promise<Category[]> {
    return this.repo
      .createQueryBuilder('category')
      .where('category.storeId = :storeId', { storeId })
      .andWhere('category.parentId IS NULL')
      .leftJoinAndSelect('category.children', 'children')
      .orderBy('category.name', 'ASC')
      .getMany();
  }

  /**
   * Get category tree (hierarchical structure) with caching
   */
  @Cacheable({
    ttl: 1800, // 30 minutes (tree structure changes infrequently)
    keyGenerator: (storeId) => `store:${storeId}:categories:tree`,
  })
  async getCategoryTree(storeId: string): Promise<Category[]> {
    // Get all categories for the store
    const categories = await this.repo.find({
      where: { storeId },
      relations: ['children', 'parent'],
      order: { name: 'ASC' },
    });

    // Build tree structure (root categories with their children)
    const rootCategories = categories.filter(cat => !cat.parentId);
    
    const buildTree = (parentCategory: Category): Category => {
      const children = categories.filter(cat => cat.parentId === parentCategory.id);
      return {
        ...parentCategory,
        children: children.map(buildTree),
      };
    };

    return rootCategories.map(buildTree);
  }

  /**
   * Search categories with caching
   */
  @Cacheable(CachePatterns.Search((storeId, searchTerm) => `search:categories:${storeId}:${searchTerm}`))
  async searchCategories(storeId: string, searchTerm: string): Promise<Category[]> {
    return this.repo
      .createQueryBuilder('category')
      .where('category.storeId = :storeId', { storeId })
      .andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', {
        search: `%${searchTerm}%`,
      })
      .orderBy('category.name', 'ASC')
      .limit(20)
      .getMany();
  }

  /**
   * Get categories by parent with caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (parentId, storeId) => `category:${parentId}:children:store:${storeId}`,
  })
  async getCategoriesByParent(parentId: number, storeId: string): Promise<Category[]> {
    return this.repo.find({
      where: { parentId, storeId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get category statistics with caching
   */
  @Cacheable({
    ttl: 900, // 15 minutes
    keyGenerator: (storeId) => `store:${storeId}:category_stats`,
  })
  async getCategoryStatistics(storeId: string): Promise<{
    totalCategories: number;
    rootCategories: number;
    categoriesWithProducts: number;
    maxDepth: number;
    averageProductsPerCategory: number;
  }> {
    const result = await this.repo
      .createQueryBuilder('category')
      .select([
        'COUNT(*) as totalCategories',
        'COUNT(CASE WHEN category.parentId IS NULL THEN 1 END) as rootCategories',
        'COUNT(CASE WHEN category.productsCount > 0 THEN 1 END) as categoriesWithProducts',
        'AVG(category.productsCount) as averageProductsPerCategory',
      ])
      .where('category.storeId = :storeId', { storeId })
      .getRawOne();

    // Calculate max depth (simplified - would need recursive query for accurate depth)
    const maxDepth = 3; // Placeholder - would calculate actual depth

    return {
      totalCategories: parseInt(result.totalCategories) || 0,
      rootCategories: parseInt(result.rootCategories) || 0,
      categoriesWithProducts: parseInt(result.categoriesWithProducts) || 0,
      maxDepth,
      averageProductsPerCategory: parseFloat(result.averageProductsPerCategory) || 0,
    };
  }

  /**
   * Get popular categories (most products) with caching
   */
  @Cacheable({
    ttl: 1800, // 30 minutes
    keyGenerator: (storeId, limit = 10) => `store:${storeId}:categories:popular:${limit}`,
  })
  async getPopularCategories(storeId: string, limit: number = 10): Promise<Category[]> {
    return this.repo.find({
      where: { storeId },
      order: { productsCount: 'DESC' },
      take: limit,
    });
  }

  /**
   * Update products count with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (categoryId, storeId) => `category:${categoryId}*`,
    keyGenerator: (categoryId, storeId) => `store:${storeId}:categories`,
  })
  async updateProductsCount(categoryId: number, storeId: string, increment: boolean = true): Promise<Category> {
    const category = await this.repo.findOne({ where: { id: categoryId, storeId } });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (increment) {
      category.productsCount += 1;
    } else {
      category.productsCount = Math.max(0, category.productsCount - 1);
    }

    return this.repo.save(category);
  }

  /**
   * Get category breadcrumb path with caching
   */
  @Cacheable({
    ttl: 1800, // 30 minutes (breadcrumbs don't change often)
    keyGenerator: (categoryId) => `category:${categoryId}:breadcrumb`,
  })
  async getCategoryBreadcrumb(categoryId: number): Promise<Category[]> {
    const breadcrumb: Category[] = [];
    let currentCategory = await this.repo.findOne({ 
      where: { id: categoryId },
      relations: ['parent'] 
    });

    while (currentCategory) {
      breadcrumb.unshift(currentCategory);
      currentCategory = currentCategory.parent;
    }

    return breadcrumb;
  }

  /**
   * Get categories with product count > 0
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (storeId) => `store:${storeId}:categories:with_products`,
  })
  async getCategoriesWithProducts(storeId: string): Promise<Category[]> {
    return this.repo
      .createQueryBuilder('category')
      .where('category.storeId = :storeId', { storeId })
      .andWhere('category.productsCount > 0')
      .orderBy('category.productsCount', 'DESC')
      .getMany();
  }

  /**
   * Manually trigger reindexing for a specific store
   * Useful for debugging or after bulk operations
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      await this.categorySearchService.reindexByStore(storeId);
      console.log(`Successfully reindexed categories for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex categories for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Debug Elasticsearch index for a specific store
   */
  async debugSearchIndex(storeId: string): Promise<void> {
    try {
      await this.categorySearchService.debugCategoriesByStore(storeId);
    } catch (error) {
      console.error(`Failed to debug search index for store ${storeId}:`, error);
      throw error;
    }
  }
}
