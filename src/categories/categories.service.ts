import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { BaseEntityService } from '../common/services/base-entity.service';
import { CacheService } from '../cache/cache.service';
import { IEntityService } from '../common/interfaces/entity-service.interface';

@Injectable()
export class CategoriesService extends BaseEntityService<Category, CreateCategoryDto, UpdateCategoryDto> implements IEntityService<Category, CreateCategoryDto, UpdateCategoryDto> {
  constructor(
    @InjectRepository(Category)
    protected readonly repository: Repository<Category>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateCategoryDto): Promise<Category> {
    const category = this.repository.create({
      ...dto,
      storeId,
      productsCount: 0,
      status: 'active',
    });
    const savedCategory = await this.repository.save(category);
    await this.invalidateCache(storeId);
    this.logger.log('Created category', { storeId, categoryId: savedCategory.id });
    return savedCategory;
  }

  async findAll(storeId: string, query: any = {}): Promise<Category[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<Category[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { storeId },
        order: { name: 'ASC' },
        ...query,
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<Category> {
    const category = await this.repository.findOne({ where: { id: parseInt(id), storeId } });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async update(storeId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(storeId, id);
    Object.assign(category, dto);
    const updatedCategory = await this.repository.save(category);
    await this.invalidateCache(storeId);
    this.logger.log('Updated category', { storeId, id, categoryId: updatedCategory.id });
    return updatedCategory;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new BadRequestException('Category has associations and cannot be deleted.');
    }
    const category = await this.findOne(storeId, id);
    await this.repository.remove(category);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted category', { storeId, id });
  }

  async query(storeId: string, queryDto: any, userId: string): Promise<Category[]> {
    const qb = this.repository.createQueryBuilder('category');
    qb.where('category.storeId = :storeId', { storeId });

    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `category.${filter.column}`;
        let condition = '';
        let value = filter.value;

        switch (filter.operator) {
          case 'contains':
            condition = `${column} ILIKE :${paramKey}`;
            value = `%${value}%`;
            break;
          case 'startsWith':
            condition = `${column} ILIKE :${paramKey}`;
            value = `${value}%`;
            break;
          case 'endsWith':
            condition = `${column} ILIKE :${paramKey}`;
            value = `%${value}`;
            break;
          case 'equals':
            condition = `${column} = :${paramKey}`;
            break;
        }

        qb.andWhere(condition, { [paramKey]: value });
      });
    }

    // Apply sorting
    if (queryDto.sorts) {
      queryDto.sorts.forEach((sort: any) => {
        qb.addOrderBy(`category.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the category is referenced in other tables (e.g., variants, subcategories)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this category is referenced in any variants
    const variantCount = await this.repository
      .createQueryBuilder('category')
      .leftJoin('category.variants', 'variants')
      .where('category.id = :id', { id })
      .andWhere('category.storeId = :storeId', { storeId })
      .getCount();

    // Check if this category has subcategories
    const subcategoryCount = await this.repository
      .createQueryBuilder('category')
      .where('category.parentId = :id', { id })
      .andWhere('category.storeId = :storeId', { storeId })
      .getCount();
    
    return variantCount > 0 || subcategoryCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  async getRootCategories(storeId: string): Promise<Category[]> {
    return this.repository.find({
      where: { storeId, parentId: undefined },
      order: { name: 'ASC' },
    });
  }

  async getCategoryTree(storeId: string): Promise<Category[]> {
    const categories = await this.repository.find({
      where: { storeId },
      order: { name: 'ASC' },
    });

    const buildTree = (parentCategory: Category): Category => {
      const children = categories.filter(cat => cat.parentId === parentCategory.id);
      return {
        ...parentCategory,
        children: children.map(child => buildTree(child)),
      };
    };

    const rootCategories = categories.filter(cat => cat.parentId === undefined || cat.parentId === null);
    return rootCategories.map(root => buildTree(root));
  }

  async getCategoriesByParent(parentId: number, storeId: string): Promise<Category[]> {
    return this.repository.find({
      where: { parentId, storeId },
      order: { name: 'ASC' },
    });
  }

  async updateProductsCount(categoryId: number, storeId: string, increment: boolean = true): Promise<Category> {
    const category = await this.repository.findOne({ where: { id: categoryId, storeId } });
    if (!category) {
      throw new NotFoundException(`Category #${categoryId} not found`);
    }

    category.productsCount = increment ? category.productsCount + 1 : Math.max(0, category.productsCount - 1);
    return this.repository.save(category);
  }

  async getPopularCategories(storeId: string, limit: number = 10): Promise<Category[]> {
    return this.repository.find({
      where: { storeId },
      order: { productsCount: 'DESC' },
      take: limit,
    });
  }

  async getCategoryStatistics(storeId: string): Promise<{
    totalCategories: number;
    rootCategories: number;
    categoriesWithProducts: number;
    maxDepth: number;
    averageProductsPerCategory: number;
  }> {
    const totalCategories = await this.repository.count({ where: { storeId } });
    const rootCategories = await this.repository.count({ where: { storeId, parentId: undefined } });
    const categoriesWithProducts = await this.repository.count({ 
      where: { storeId, productsCount: 0 },
    });

    const result = await this.repository
      .createQueryBuilder('category')
      .select('AVG(category.productsCount)', 'average')
      .where('category.storeId = :storeId', { storeId })
      .getRawOne();

    // Calculate max depth (simplified - could be more complex for nested trees)
    const maxDepthResult = await this.repository
      .createQueryBuilder('category')
      .select('MAX(category.level)', 'maxLevel')
      .where('category.storeId = :storeId', { storeId })
      .getRawOne();

    return {
      totalCategories,
      rootCategories,
      categoriesWithProducts: totalCategories - categoriesWithProducts,
      maxDepth: parseInt(maxDepthResult.maxLevel) || 0,
      averageProductsPerCategory: parseFloat(result.average) || 0,
    };
  }

  async getCategoryBreadcrumb(categoryId: number): Promise<Category[]> {
    const breadcrumb: Category[] = [];
    let currentCategory = await this.repository.findOne({ where: { id: categoryId } });

    while (currentCategory) {
      breadcrumb.unshift(currentCategory);
      if (currentCategory.parentId) {
        currentCategory = await this.repository.findOne({ where: { id: currentCategory.parentId } });
      } else {
        break;
      }
    }

    return breadcrumb;
  }

  async getCategoriesWithProducts(storeId: string): Promise<Category[]> {
    return this.repository.find({
      where: { storeId, productsCount: 0 },
      order: { productsCount: 'DESC' },
    });
  }

  async searchCategories(storeId: string, searchTerm: string): Promise<Category[]> {
    return this.repository
      .createQueryBuilder('category')
      .where('category.storeId = :storeId', { storeId })
      .andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', { 
        search: `%${searchTerm}%` 
      })
      .orderBy('category.name', 'ASC')
      .getMany();
  }
}
