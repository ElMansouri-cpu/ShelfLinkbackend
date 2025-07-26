import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategorySearchService } from './services/category-search.service';
import { CacheService } from '../cache/cache.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: Repository<Category>;
  let cacheService: CacheService;
  let searchService: CategorySearchService;
  let logger: Logger;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidatePattern: jest.fn(),
  };

  const mockSearchService = {
    index: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    searchEntities: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CategorySearchService,
          useValue: mockSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get<Repository<Category>>(getRepositoryToken(Category));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<CategorySearchService>(CategorySearchService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const storeId = 'store-123';
    const categoryId = '1';
    const createDto: CreateCategoryDto = {
      name: 'Test Category',
      description: 'Test Description',
      parentId: undefined,
      storeId: storeId,
    };
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Category',
    };
    const mockCategory = {
      id: 1,
      name: 'Test Category',
      description: 'Test Description',
      parentId: null,
      storeId: storeId,
      productsCount: 0,
      level: 0,
      path: '/test-category',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    describe('create', () => {
      it('should create a category and sync with cache and search', async () => {
        const createdCategory = { ...mockCategory, id: 1 };
        mockRepository.create.mockReturnValue(createdCategory);
        mockRepository.save.mockResolvedValue(createdCategory);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.create(storeId, createDto);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDto,
          storeId,
          productsCount: 0,
          status: 'active',
        });
        expect(mockRepository.save).toHaveBeenCalledWith(createdCategory);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledWith(createdCategory);
        expect(mockLogger.log).toHaveBeenCalledWith('Created category', { storeId, categoryId: createdCategory.id });
        expect(result).toEqual(createdCategory);
      });

      it('should set level to 1 for categories with parent', async () => {
        const createDtoWithParent = { ...createDto, parentId: 5 };
        const createdCategory = { ...mockCategory, id: 1, level: 1 };
        mockRepository.create.mockReturnValue(createdCategory);
        mockRepository.save.mockResolvedValue(createdCategory);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        await service.create(storeId, createDtoWithParent);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDtoWithParent,
          storeId,
          productsCount: 0,
          status: 'active',
        });
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedCategories = [mockCategory];
        mockCacheService.get.mockResolvedValue(cachedCategories);

        const result = await service.findAll(storeId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${storeId}:entity:{}`);
        expect(result).toEqual(cachedCategories);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const categories = [mockCategory];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(categories);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(storeId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { name: 'ASC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${storeId}:entity:{}`, categories);
        expect(result).toEqual(categories);
      });
    });

    describe('findOne', () => {
      it('should return a category by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockCategory);

        const result = await service.findOne(storeId, categoryId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, storeId } });
        expect(result).toEqual(mockCategory);
      });

      it('should throw NotFoundException if category not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(storeId, categoryId)).rejects.toThrow('Category #1 not found');
      });
    });

    describe('update', () => {
      it('should update a category and sync with cache and search', async () => {
        const updatedCategory = { ...mockCategory, name: 'Updated Category' };
        mockRepository.findOne.mockResolvedValue(mockCategory);
        mockRepository.save.mockResolvedValue(updatedCategory);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.update(storeId, categoryId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedCategory);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedCategory);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated category', { storeId, id: categoryId, categoryId: updatedCategory.id });
        expect(result).toEqual(updatedCategory);
      });
    });

    describe('delete', () => {
      it('should delete a category and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockCategory);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.remove.mockResolvedValue(undefined);

        await service.delete(storeId, categoryId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockCategory);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.remove).toHaveBeenCalledWith(storeId, categoryId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted category', { storeId, id: categoryId });
      });

      it('should throw error if category has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockCategory);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 variants
        });

        await expect(service.delete(storeId, categoryId)).rejects.toThrow('Category has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for categories without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(false);
    });

    it('should return true for categories with variants', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(true);
    });

    it('should return true for categories with subcategories', async () => {
      // Mock first query (variants) to return 0
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      
      // Mock second query (subcategories) to return 2
      const mockSubQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };

      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockSubQueryBuilder);

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(true);
    });
  });

  describe('Entity-specific methods', () => {
    const storeId = 'store-123';
    const mockCategory = {
      id: 1,
      name: 'Test Category',
      productsCount: 5,
      storeId,
      level: 0,
    } as any;

    describe('getRootCategories', () => {
      it('should return root categories', async () => {
        const rootCategories = [mockCategory];
        mockRepository.find.mockResolvedValue(rootCategories);

        const result = await service.getRootCategories(storeId);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId, parentId: undefined },
          order: { name: 'ASC' },
        });
        expect(result).toEqual(rootCategories);
      });
    });

    describe('getCategoryTree', () => {
      it('should build category tree', async () => {
        const categories = [
          { ...mockCategory, id: 1, parentId: null },
          { ...mockCategory, id: 2, parentId: 1 },
          { ...mockCategory, id: 3, parentId: 1 },
        ];
        mockRepository.find.mockResolvedValue(categories);

        const result = await service.getCategoryTree(storeId);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
        expect(result[0].children).toHaveLength(2);
      });
    });

    describe('getCategoriesByParent', () => {
      it('should return categories by parent', async () => {
        const childCategories = [mockCategory];
        mockRepository.find.mockResolvedValue(childCategories);

        const result = await service.getCategoriesByParent(1, storeId);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { parentId: 1, storeId },
          order: { name: 'ASC' },
        });
        expect(result).toEqual(childCategories);
      });
    });

    describe('updateProductsCount', () => {
      it('should increment products count', async () => {
        const categoryWithCount = { ...mockCategory, productsCount: 5 };
        mockRepository.findOne.mockResolvedValue(categoryWithCount);
        mockRepository.save.mockResolvedValue({ ...categoryWithCount, productsCount: 6 });

        const result = await service.updateProductsCount(1, storeId, true);

        expect(mockRepository.save).toHaveBeenCalledWith({ ...categoryWithCount, productsCount: 6 });
        expect(result.productsCount).toBe(6);
      });

      it('should decrement products count', async () => {
        const categoryWithCount = { ...mockCategory, productsCount: 5 };
        mockRepository.findOne.mockResolvedValue(categoryWithCount);
        mockRepository.save.mockResolvedValue({ ...categoryWithCount, productsCount: 4 });

        const result = await service.updateProductsCount(1, storeId, false);

        expect(mockRepository.save).toHaveBeenCalledWith({ ...categoryWithCount, productsCount: 4 });
        expect(result.productsCount).toBe(4);
      });
    });

    describe('getPopularCategories', () => {
      it('should return popular categories ordered by products count', async () => {
        const popularCategories = [
          { ...mockCategory, id: 1, productsCount: 10 },
          { ...mockCategory, id: 2, productsCount: 5 },
        ];
        mockRepository.find.mockResolvedValue(popularCategories);

        const result = await service.getPopularCategories(storeId, 10);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { productsCount: 'DESC' },
          take: 10,
        });
        expect(result).toEqual(popularCategories);
      });
    });

    describe('getCategoryStatistics', () => {
      it('should return category statistics', async () => {
        mockRepository.count
          .mockResolvedValueOnce(5) // totalCategories
          .mockResolvedValueOnce(2) // rootCategories
          .mockResolvedValueOnce(2); // categoriesWithProducts (categories with productsCount = 0)
        mockRepository.createQueryBuilder.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ average: '6.5' }),
        });

        const result = await service.getCategoryStatistics(storeId);

        expect(result).toEqual({
          totalCategories: 5,
          rootCategories: 2,
          categoriesWithProducts: 3, // 5 - 2
          maxDepth: 0,
          averageProductsPerCategory: 6.5,
        });
      });
    });

    describe('getCategoryBreadcrumb', () => {
      it('should return category breadcrumb', async () => {
        const parentCategory = { ...mockCategory, id: 1, parentId: null };
        const childCategory = { ...mockCategory, id: 2, parentId: 1 };
        
        mockRepository.findOne
          .mockResolvedValueOnce(childCategory)
          .mockResolvedValueOnce(parentCategory);

        const result = await service.getCategoryBreadcrumb(2);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
      });
    });

    describe('searchCategories', () => {
      it('should search categories by name or description', async () => {
        const searchResults = [mockCategory];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(searchResults),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.searchCategories(storeId, 'test');

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          '(category.name ILIKE :search OR category.description ILIKE :search)',
          { search: '%test%' }
        );
        expect(result).toEqual(searchResults);
      });
    });
  });

  describe('query', () => {
    it('should build query with filters and sorts', async () => {
      const queryDto = {
        filters: [
          { column: 'name', operator: 'contains', value: 'test' },
          { column: 'level', operator: 'equals', value: 0 },
        ],
        sorts: [
          { column: 'name', direction: 'ASC' },
          { column: 'productsCount', direction: 'DESC' },
        ],
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.query('store-123', queryDto, 'user-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.storeId = :storeId', { storeId: 'store-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
}); 