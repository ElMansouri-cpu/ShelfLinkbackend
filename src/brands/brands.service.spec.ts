import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandSearchService } from './services/brand-search.service';
import { CacheService } from '../cache/cache.service';

describe('BrandsService', () => {
  let service: BrandsService;
  let repository: Repository<Brand>;
  let cacheService: CacheService;
  let searchService: BrandSearchService;
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
        BrandsService,
        {
          provide: getRepositoryToken(Brand),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: BrandSearchService,
          useValue: mockSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
    repository = module.get<Repository<Brand>>(getRepositoryToken(Brand));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<BrandSearchService>(BrandSearchService);
    logger = module.get<Logger>(Logger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const storeId = 'store-123';
    const brandId = '1';
    const createDto: CreateBrandDto = {
      name: 'Test Brand',
      description: 'Test Description',
      website: 'https://test.com',
      storeId: storeId,
    };
    const updateDto: UpdateBrandDto = {
      name: 'Updated Brand',
    };
    const mockBrand: Brand = {
      id: 1,
      name: 'Test Brand',
      description: 'Test Description',
      website: 'https://test.com',
      storeId: storeId,
      productsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Brand;

    describe('create', () => {
      it('should create a brand and sync with cache and search', async () => {
        const createdBrand = { ...mockBrand, id: 1 };
        mockRepository.create.mockReturnValue(createdBrand);
        mockRepository.save.mockResolvedValue(createdBrand);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.create(storeId, createDto);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDto,
          storeId,
          productsCount: 0,
        });
        expect(mockRepository.save).toHaveBeenCalledWith(createdBrand);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledWith(createdBrand);
        expect(mockLogger.log).toHaveBeenCalledWith('Created brand', { storeId, brandId: createdBrand.id });
        expect(result).toEqual(createdBrand);
      });

      it('should handle creation errors', async () => {
        const error = new Error('Database error');
        mockRepository.save.mockRejectedValue(error);

        await expect(service.create(storeId, createDto)).rejects.toThrow('Database error');
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedBrands = [mockBrand];
        mockCacheService.get.mockResolvedValue(cachedBrands);

        const result = await service.findAll(storeId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${storeId}:entity:{}`);
        expect(result).toEqual(cachedBrands);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const brands = [mockBrand];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(brands);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(storeId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { name: 'ASC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${storeId}:entity:{}`, brands);
        expect(result).toEqual(brands);
      });
    });

    describe('findOne', () => {
      it('should return a brand by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockBrand);

        const result = await service.findOne(storeId, brandId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, storeId } });
        expect(result).toEqual(mockBrand);
      });

      it('should throw NotFoundException if brand not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(storeId, brandId)).rejects.toThrow('Brand #1 not found');
      });
    });

    describe('update', () => {
      it('should update a brand and sync with cache and search', async () => {
        const updatedBrand = { ...mockBrand, name: 'Updated Brand' };
        mockRepository.findOne.mockResolvedValue(mockBrand);
        mockRepository.save.mockResolvedValue(updatedBrand);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.update(storeId, brandId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedBrand);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedBrand);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated brand', { storeId, id: brandId, brandId: updatedBrand.id });
        expect(result).toEqual(updatedBrand);
      });
    });

    describe('delete', () => {
      it('should delete a brand and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockBrand);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.remove.mockResolvedValue(undefined);

        await service.delete(storeId, brandId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockBrand);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.remove).toHaveBeenCalledWith(storeId, brandId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted brand', { storeId, id: brandId });
      });

      it('should throw error if brand has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockBrand);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 variants
        });

        await expect(service.delete(storeId, brandId)).rejects.toThrow('Brand has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for brands without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(false);
    });

    it('should return true for brands with associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(true);
    });
  });

  describe('Entity-specific methods', () => {
    const storeId = 'store-123';
    const mockBrand: Brand = {
      id: 1,
      name: 'Test Brand',
      productsCount: 5,
      storeId,
    } as Brand;

    describe('updateProductsCount', () => {
      it('should increment products count', async () => {
        const brandWithCount = { ...mockBrand, productsCount: 5 };
        mockRepository.findOne.mockResolvedValue(brandWithCount);
        mockRepository.save.mockResolvedValue({ ...brandWithCount, productsCount: 6 });

        const result = await service.updateProductsCount(1, storeId, true);

        expect(mockRepository.save).toHaveBeenCalledWith({ ...brandWithCount, productsCount: 6 });
        expect(result.productsCount).toBe(6);
      });

      it('should decrement products count', async () => {
        const brandWithCount = { ...mockBrand, productsCount: 5 };
        mockRepository.findOne.mockResolvedValue(brandWithCount);
        mockRepository.save.mockResolvedValue({ ...brandWithCount, productsCount: 4 });

        const result = await service.updateProductsCount(1, storeId, false);

        expect(mockRepository.save).toHaveBeenCalledWith({ ...brandWithCount, productsCount: 4 });
        expect(result.productsCount).toBe(4);
      });

      it('should not go below 0', async () => {
        const brandWithCount = { ...mockBrand, productsCount: 0 };
        mockRepository.findOne.mockResolvedValue(brandWithCount);
        mockRepository.save.mockResolvedValue({ ...brandWithCount, productsCount: 0 });

        const result = await service.updateProductsCount(1, storeId, false);

        expect(mockRepository.save).toHaveBeenCalledWith({ ...brandWithCount, productsCount: 0 });
        expect(result.productsCount).toBe(0);
      });
    });

    describe('getPopularBrands', () => {
      it('should return popular brands ordered by products count', async () => {
        const popularBrands = [
          { ...mockBrand, id: 1, productsCount: 10 },
          { ...mockBrand, id: 2, productsCount: 5 },
        ];
        mockRepository.find.mockResolvedValue(popularBrands);

        const result = await service.getPopularBrands(storeId, 10);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { productsCount: 'DESC' },
          take: 10,
        });
        expect(result).toEqual(popularBrands);
      });
    });

    describe('getBrandStatistics', () => {
      it('should return brand statistics', async () => {
        const topBrand = { ...mockBrand, productsCount: 10 };
        mockRepository.count
          .mockResolvedValueOnce(5) // totalBrands
          .mockResolvedValueOnce(2); // brandsWithProducts
        mockRepository.findOne.mockResolvedValue(topBrand);
        mockRepository.createQueryBuilder.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ average: '6.5' }),
        });

        const result = await service.getBrandStatistics(storeId);

        expect(result).toEqual({
          totalBrands: 5,
          brandsWithProducts: 3, // 5 - 2
          topBrandByProducts: topBrand,
          averageProductsPerBrand: 6.5,
        });
      });
    });

    describe('getBrandDependencies', () => {
      it('should return brand dependencies', async () => {
        const brandWithVariants = {
          ...mockBrand,
          variants: [{ id: 1 }, { id: 2 }, { id: 3 }],
        };
        mockRepository.findOne.mockResolvedValue(brandWithVariants);

        const result = await service.getBrandDependencies(1, storeId);

        expect(result).toEqual({
          hasVariants: true,
          variantCount: 3,
          variants: [{ id: 1 }, { id: 2 }, { id: 3 }],
        });
      });

      it('should return empty dependencies for brand without variants', async () => {
        const brandWithoutVariants = {
          ...mockBrand,
          variants: [],
        };
        mockRepository.findOne.mockResolvedValue(brandWithoutVariants);

        const result = await service.getBrandDependencies(1, storeId);

        expect(result).toEqual({
          hasVariants: false,
          variantCount: 0,
          variants: [],
        });
      });
    });
  });

  describe('query', () => {
    it('should build query with filters and sorts', async () => {
      const queryDto = {
        filters: [
          { column: 'name', operator: 'contains', value: 'test' },
          { column: 'productsCount', operator: 'equals', value: 5 },
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

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('brand.storeId = :storeId', { storeId: 'store-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
}); 