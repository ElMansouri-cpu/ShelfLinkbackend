import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariantService } from './variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { VariantSearchService } from './variant-search.service';
import { CacheService } from '../../cache/cache.service';
import { Logger } from '@nestjs/common';

describe('VariantService', () => {
  let service: VariantService;
  let repository: any; // Change to any to match base service expectations
  let cacheService: CacheService;
  let searchService: VariantSearchService;
  let logger: Logger;

  const mockVariant: Variant = {
    id: '1',
    isActive: true,
    name: 'Test Variant',
    sku: 'TEST-001',
    barcode: '123456789',
    description: 'Test description',
    storeId: 'store-1',
    buyPriceHt: 100,
    buyDiscountPct: 0,
    buyPriceNetHt: 100,
    buyPriceTtc: 120,
    sellPriceHt: 150,
    sellPriceTtc: 180,
    margePct: 50,
    margeType: 'percentage',
    image: 'test-image.jpg',
    brandId: 'brand-1',
    categoryId: 'category-1',
    providerId: 'provider-1',
    unitId: 'unit-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    taxes: [],
    store: {} as any,
    brand: {} as any,
    category: {} as any,
    provider: {} as any,
    unit: {} as any,
  };

  const mockCreateDto: CreateVariantDto = {
    name: 'New Variant',
    sku: 'NEW-001',
    barcode: '987654321',
    description: 'New description',
    price: 200,
    cost: 150,
    productId: 'product-1',
    image: 'new-image.jpg',
    marginType: 'percentage',
    buyPriceHt: 200,
    buyDiscountPct: 0,
    buyPriceNetHt: 200,
    buyPriceTtc: 240,
    margePct: 50,
    sellPriceHt: 300,
    sellPriceTtc: 360,
    providerId: 'provider-1',
    storeId: 'store-1',
    taxes: [],
  };

  const mockUpdateDto: UpdateVariantDto = {
    name: 'Updated Variant',
    sku: 'UPD-001',
    barcode: '111222333',
    description: 'Updated description',
    price: 250,
    cost: 180,
    productId: 'product-1',
    image: 'updated-image.jpg',
    marginType: 'percentage',
    buyPriceHt: 180,
    buyDiscountPct: 0,
    buyPriceNetHt: 180,
    buyPriceTtc: 216,
    margePct: 50,
    sellPriceHt: 270,
    sellPriceTtc: 324,
    providerId: 'provider-1',
    storeId: 'store-1',
    taxes: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantService,
        {
          provide: getRepositoryToken(Variant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidatePattern: jest.fn(),
          },
        },
        {
          provide: VariantSearchService,
          useValue: {
            index: jest.fn(),
            search: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VariantService>(VariantService);
    repository = module.get<any>(getRepositoryToken(Variant));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<VariantSearchService>(VariantSearchService);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a variant and sync with cache and search', async () => {
      // Arrange
      const storeId = 'store-1';
      jest.spyOn(repository, 'create').mockResolvedValue(mockVariant);
      jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(1);
      jest.spyOn(searchService, 'index').mockResolvedValue({});

      // Act
      const result = await service.create(storeId, mockCreateDto);

      // Assert
      expect(repository.create).toHaveBeenCalledWith(storeId, mockCreateDto);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
      expect(searchService.index).toHaveBeenCalledWith(mockVariant);
      expect(logger.log).toHaveBeenCalledWith('Created entity', {
        storeId,
        entity: mockVariant,
      });
      expect(result).toEqual(mockVariant);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const error = new Error('Database error');
      jest.spyOn(repository, 'create').mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(storeId, mockCreateDto)).rejects.toThrow(error);
      expect(cacheService.invalidatePattern).not.toHaveBeenCalled();
      expect(searchService.index).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return cached results if available', async () => {
      // Arrange
      const storeId = 'store-1';
      const query = { page: 1, limit: 10 };
      const cachedResults = [mockVariant];
      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedResults);

      // Act
      const result = await service.findAll(storeId, query);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith(
        `store:${storeId}:entity:${JSON.stringify(query)}`
      );
      expect(searchService.search).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResults);
    });

    it('should fetch from search service and cache results if not cached', async () => {
      // Arrange
      const storeId = 'store-1';
      const query = { page: 1, limit: 10 };
      const searchResults = {
        data: [mockVariant],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      jest.spyOn(cacheService, 'get').mockResolvedValue(undefined);
      jest.spyOn(searchService, 'search').mockResolvedValue(searchResults);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      // Act
      const result = await service.findAll(storeId, query);

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(searchService.search).toHaveBeenCalledWith(storeId, query);
      expect(cacheService.set).toHaveBeenCalledWith(
        `store:${storeId}:entity:${JSON.stringify(query)}`,
        searchResults
      );
      expect(result).toEqual(searchResults);
    });
  });

  describe('findOne', () => {
    it('should return a variant by ID from search service', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      jest.spyOn(searchService, 'findById').mockResolvedValue(mockVariant);

      // Act
      const result = await service.findOne(storeId, id);

      // Assert
      expect(searchService.findById).toHaveBeenCalledWith(storeId, id);
      expect(result).toEqual(mockVariant);
    });

    it('should return null if variant not found', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '999';
      jest.spyOn(searchService, 'findById').mockResolvedValue(null);

      // Act
      const result = await service.findOne(storeId, id);

      // Assert
      expect(searchService.findById).toHaveBeenCalledWith(storeId, id);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a variant and sync with cache and search', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const updatedVariant: Variant = { 
        ...mockVariant, 
        name: mockUpdateDto.name,
        description: mockUpdateDto.description,
        sku: mockUpdateDto.sku,
        barcode: mockUpdateDto.barcode,
        image: mockUpdateDto.image || '',
        buyPriceHt: mockUpdateDto.buyPriceHt,
        buyDiscountPct: mockUpdateDto.buyDiscountPct,
        buyPriceNetHt: mockUpdateDto.buyPriceNetHt,
        buyPriceTtc: mockUpdateDto.buyPriceTtc || 0,
        margePct: mockUpdateDto.margePct,
        sellPriceHt: mockUpdateDto.sellPriceHt,
        sellPriceTtc: mockUpdateDto.sellPriceTtc || 0,
        providerId: mockUpdateDto.providerId,
      };
      jest.spyOn(repository, 'update').mockResolvedValue(updatedVariant);
      jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(1);
      jest.spyOn(searchService, 'update').mockResolvedValue({});

      // Act
      const result = await service.update(storeId, id, mockUpdateDto);

      // Assert
      expect(repository.update).toHaveBeenCalledWith(storeId, id, mockUpdateDto);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
      expect(searchService.update).toHaveBeenCalledWith(updatedVariant);
      expect(logger.log).toHaveBeenCalledWith('Updated entity', {
        storeId,
        id,
        entity: updatedVariant,
      });
      expect(result).toEqual(updatedVariant);
    });

    it('should handle update errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const error = new Error('Update failed');
      jest.spyOn(repository, 'update').mockRejectedValue(error);

      // Act & Assert
      await expect(service.update(storeId, id, mockUpdateDto)).rejects.toThrow(error);
      expect(cacheService.invalidatePattern).not.toHaveBeenCalled();
      expect(searchService.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a variant and sync with cache and search', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      jest.spyOn(service, 'checkAssociations').mockResolvedValue(false);
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(1);
      jest.spyOn(searchService, 'remove').mockResolvedValue({});

      // Act
      await service.delete(storeId, id);

      // Assert
      expect(service.checkAssociations).toHaveBeenCalledWith(storeId, id);
      expect(repository.delete).toHaveBeenCalledWith(storeId, id);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
      expect(searchService.remove).toHaveBeenCalledWith(storeId, id);
      expect(logger.log).toHaveBeenCalledWith('Deleted entity', { storeId, id });
    });

    it('should throw error if variant has associations', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      jest.spyOn(service, 'checkAssociations').mockResolvedValue(true);

      // Act & Assert
      await expect(service.delete(storeId, id)).rejects.toThrow(
        'Entity has associations and cannot be deleted.'
      );
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cacheService.invalidatePattern).not.toHaveBeenCalled();
      expect(searchService.remove).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const error = new Error('Delete failed');
      jest.spyOn(service, 'checkAssociations').mockResolvedValue(false);
      jest.spyOn(repository, 'delete').mockRejectedValue(error);

      // Act & Assert
      await expect(service.delete(storeId, id)).rejects.toThrow(error);
      expect(cacheService.invalidatePattern).not.toHaveBeenCalled();
      expect(searchService.remove).not.toHaveBeenCalled();
    });
  });

  describe('checkAssociations', () => {
    it('should return false for variants without associations', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';

      // Act
      const result = await service.checkAssociations(storeId, id);

      // Assert
      expect(result).toBe(false);
    });

    // Add more tests when implementing actual association checking logic
  });

  describe('entity-specific methods', () => {
    describe('findBySku', () => {
      it('should find variant by SKU and store ID', async () => {
        // Arrange
        const sku = 'TEST-001';
        const storeId = 'store-1';
        jest.spyOn(repository, 'findOne').mockResolvedValue(mockVariant);

        // Act
        const result = await service.findBySku(sku, storeId);

        // Assert
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { sku, storeId },
          relations: ['taxes'],
        });
        expect(result).toEqual(mockVariant);
      });

      it('should return null if variant not found', async () => {
        // Arrange
        const sku = 'NONEXISTENT';
        const storeId = 'store-1';
        jest.spyOn(repository, 'findOne').mockResolvedValue(null);

        // Act
        const result = await service.findBySku(sku, storeId);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('findByBarcode', () => {
      it('should find variant by barcode and store ID', async () => {
        // Arrange
        const barcode = '123456789';
        const storeId = 'store-1';
        jest.spyOn(repository, 'findOne').mockResolvedValue(mockVariant);

        // Act
        const result = await service.findByBarcode(barcode, storeId);

        // Assert
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { barcode, storeId },
          relations: ['taxes'],
        });
        expect(result).toEqual(mockVariant);
      });
    });

    describe('searchVariants', () => {
      it('should search variants with query builder', async () => {
        // Arrange
        const storeId = 'store-1';
        const searchTerm = 'test';
        const limit = 20;
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([mockVariant]),
        };
        jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

        // Act
        const result = await service.searchVariants(storeId, searchTerm, limit);

        // Assert
        expect(repository.createQueryBuilder).toHaveBeenCalledWith('variant');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.storeId = :storeId', { storeId });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          '(variant.name ILIKE :search OR variant.sku ILIKE :search OR variant.barcode ILIKE :search)',
          { search: `%${searchTerm}%` }
        );
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('variant.taxes', 'taxes');
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('variant.createdAt', 'DESC');
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
        expect(result).toEqual([mockVariant]);
      });
    });
  });

  describe('monitoring methods', () => {
    describe('healthCheck', () => {
      it('should return health status', async () => {
        // Act
        const result = await service.healthCheck();

        // Assert
        expect(result).toEqual({ status: 'ok' });
      });
    });

    describe('getMetrics', () => {
      it('should return metrics', async () => {
        // Act
        const result = await service.getMetrics();

        // Assert
        expect(result).toEqual({});
      });
    });
  });
}); 