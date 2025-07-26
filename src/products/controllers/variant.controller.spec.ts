import { Test, TestingModule } from '@nestjs/testing';
import { VariantController } from './variant.controller';
import { VariantService } from '../services/variant.service';
import { VariantSearchService } from '../services/variant-search.service';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { Variant } from '../entities/variant.entity';
import { NotFoundException } from '@nestjs/common';

describe('VariantController', () => {
  let controller: VariantController;
  let variantService: VariantService;
  let variantSearchService: VariantSearchService;

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
      controllers: [VariantController],
      providers: [
        {
          provide: VariantService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findBySku: jest.fn(),
            findByBarcode: jest.fn(),
            searchVariants: jest.fn(),
          },
        },
        {
          provide: VariantSearchService,
          useValue: {
            searchVariants: jest.fn(),
            debugIndexedData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VariantController>(VariantController);
    variantService = module.get<VariantService>(VariantService);
    variantSearchService = module.get<VariantSearchService>(VariantSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new variant', async () => {
      // Arrange
      const storeId = 'store-1';
      jest.spyOn(variantService, 'create').mockResolvedValue(mockVariant);

      // Act
      const result = await controller.create(storeId, mockCreateDto);

      // Assert
      expect(variantService.create).toHaveBeenCalledWith(storeId, mockCreateDto);
      expect(result).toEqual(mockVariant);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const error = new Error('Creation failed');
      jest.spyOn(variantService, 'create').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(storeId, mockCreateDto)).rejects.toThrow(error);
    });
  });

  describe('fetch', () => {
    it('should fetch variants with query parameters', async () => {
      // Arrange
      const storeId = 'store-1';
      const query = { page: 1, limit: 10, q: 'test' };
      const variants = [mockVariant];
      jest.spyOn(variantService, 'findAll').mockResolvedValue(variants);

      // Act
      const result = await controller.fetch(storeId, query);

      // Assert
      expect(variantService.findAll).toHaveBeenCalledWith(storeId, query);
      expect(result).toEqual(variants);
    });

    it('should handle empty query parameters', async () => {
      // Arrange
      const storeId = 'store-1';
      const query = {};
      const variants = [mockVariant];
      jest.spyOn(variantService, 'findAll').mockResolvedValue(variants);

      // Act
      const result = await controller.fetch(storeId, query);

      // Assert
      expect(variantService.findAll).toHaveBeenCalledWith(storeId, query);
      expect(result).toEqual(variants);
    });
  });

  describe('findOne', () => {
    it('should return a variant by ID', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      jest.spyOn(variantService, 'findOne').mockResolvedValue(mockVariant);

      // Act
      const result = await controller.findOne(storeId, id);

      // Assert
      expect(variantService.findOne).toHaveBeenCalledWith(storeId, id);
      expect(result).toEqual(mockVariant);
    });

    it('should handle variant not found', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '999';
      jest.spyOn(variantService, 'findOne').mockResolvedValue(null as any);

      // Act
      const result = await controller.findOne(storeId, id);

      // Assert
      expect(variantService.findOne).toHaveBeenCalledWith(storeId, id);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a variant', async () => {
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
      jest.spyOn(variantService, 'update').mockResolvedValue(updatedVariant);

      // Act
      const result = await controller.update(storeId, id, mockUpdateDto);

      // Assert
      expect(variantService.update).toHaveBeenCalledWith(storeId, id, mockUpdateDto);
      expect(result).toEqual(updatedVariant);
    });

    it('should handle update errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const error = new Error('Update failed');
      jest.spyOn(variantService, 'update').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(storeId, id, mockUpdateDto)).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete a variant', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      jest.spyOn(variantService, 'delete').mockResolvedValue(undefined);

      // Act
      const result = await controller.delete(storeId, id);

      // Assert
      expect(variantService.delete).toHaveBeenCalledWith(storeId, id);
      expect(result).toBeUndefined();
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const error = new Error('Cannot delete variant with associations');
      jest.spyOn(variantService, 'delete').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.delete(storeId, id)).rejects.toThrow(error);
    });
  });

  describe('search', () => {
    it('should search variants with Elasticsearch', async () => {
      // Arrange
      const storeId = 'store-1';
      const q = 'test query';
      const page = '1';
      const limit = '20';
      const rawFilters = { category: 'electronics' };
      const searchResults = {
        data: [mockVariant],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      jest.spyOn(variantSearchService, 'searchVariants').mockResolvedValue(searchResults);

      // Act
      const result = await controller.search(storeId, q, page, limit, rawFilters);

      // Assert
      expect(variantSearchService.searchVariants).toHaveBeenCalledWith(q, {
        page: 1,
        limit: 20,
        storeId,
        category: 'electronics',
      });
      expect(result).toEqual(searchResults);
    });

    it('should handle array filters correctly', async () => {
      // Arrange
      const storeId = 'store-1';
      const q = 'test';
      const page = '1';
      const limit = '10';
      const rawFilters = { category: ['electronics', 'computers'] };
      const searchResults = { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
      jest.spyOn(variantSearchService, 'searchVariants').mockResolvedValue(searchResults);

      // Act
      const result = await controller.search(storeId, q, page, limit, rawFilters);

      // Assert
      expect(variantSearchService.searchVariants).toHaveBeenCalledWith(q, {
        page: 1,
        limit: 10,
        storeId,
        category: ['electronics', 'computers'],
      });
      expect(result).toEqual(searchResults);
    });

    it('should handle URL encoded filters', async () => {
      // Arrange
      const storeId = 'store-1';
      const q = 'test';
      const page = '1';
      const limit = '10';
      const rawFilters = { category: 'electronics%20and%20computers' };
      const searchResults = { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
      jest.spyOn(variantSearchService, 'searchVariants').mockResolvedValue(searchResults);

      // Act
      const result = await controller.search(storeId, q, page, limit, rawFilters);

      // Assert
      expect(variantSearchService.searchVariants).toHaveBeenCalledWith(q, {
        page: 1,
        limit: 10,
        storeId,
        category: 'electronics and computers',
      });
      expect(result).toEqual(searchResults);
    });
  });

  describe('findBySku', () => {
    it('should find variant by SKU', async () => {
      // Arrange
      const storeId = 'store-1';
      const sku = 'TEST-001';
      jest.spyOn(variantService, 'findBySku').mockResolvedValue(mockVariant);

      // Act
      const result = await controller.findBySku(storeId, sku);

      // Assert
      expect(variantService.findBySku).toHaveBeenCalledWith(sku, storeId);
      expect(result).toEqual(mockVariant);
    });

    it('should return null if variant not found by SKU', async () => {
      // Arrange
      const storeId = 'store-1';
      const sku = 'NONEXISTENT';
      jest.spyOn(variantService, 'findBySku').mockResolvedValue(null);

      // Act
      const result = await controller.findBySku(storeId, sku);

      // Assert
      expect(variantService.findBySku).toHaveBeenCalledWith(sku, storeId);
      expect(result).toBeNull();
    });
  });

  describe('findByBarcode', () => {
    it('should find variant by barcode', async () => {
      // Arrange
      const storeId = 'store-1';
      const barcode = '123456789';
      jest.spyOn(variantService, 'findByBarcode').mockResolvedValue(mockVariant);

      // Act
      const result = await controller.findByBarcode(storeId, barcode);

      // Assert
      expect(variantService.findByBarcode).toHaveBeenCalledWith(barcode, storeId);
      expect(result).toEqual(mockVariant);
    });

    it('should return null if variant not found by barcode', async () => {
      // Arrange
      const storeId = 'store-1';
      const barcode = '999999999';
      jest.spyOn(variantService, 'findByBarcode').mockResolvedValue(null);

      // Act
      const result = await controller.findByBarcode(storeId, barcode);

      // Assert
      expect(variantService.findByBarcode).toHaveBeenCalledWith(barcode, storeId);
      expect(result).toBeNull();
    });
  });

  describe('debugIndexedData', () => {
    it('should return debug indexed data', async () => {
      // Arrange
      const storeId = 'store-1';
      const debugData = {
        total: 1,
        documents: [{ id: '1', score: 1.0, source: mockVariant }],
      };
      jest.spyOn(variantSearchService, 'debugIndexedData').mockResolvedValue(debugData);

      // Act
      const result = await controller.debugIndexedData(storeId);

      // Assert
      expect(variantSearchService.debugIndexedData).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(debugData);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const error = new NotFoundException('Variant not found');
      jest.spyOn(variantService, 'findOne').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(storeId, id)).rejects.toThrow(NotFoundException);
    });

    it('should handle search service errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const q = 'test';
      const error = new Error('Search service unavailable');
      jest.spyOn(variantSearchService, 'searchVariants').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.search(storeId, q, '1', '10', {})).rejects.toThrow(error);
    });
  });

  describe('input validation', () => {
    it('should handle invalid page and limit parameters', async () => {
      // Arrange
      const storeId = 'store-1';
      const q = 'test';
      const page = 'invalid';
      const limit = 'invalid';
      const rawFilters = {};
      const searchResults = { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
      jest.spyOn(variantSearchService, 'searchVariants').mockResolvedValue(searchResults);

      // Act
      const result = await controller.search(storeId, q, page, limit, rawFilters);

      // Assert
      expect(variantSearchService.searchVariants).toHaveBeenCalledWith(q, {
        page: NaN,
        limit: NaN,
        storeId,
      });
      expect(result).toEqual(searchResults);
    });

    it('should handle empty search query', async () => {
      // Arrange
      const storeId = 'store-1';
      const q = '';
      const page = '1';
      const limit = '10';
      const rawFilters = {};
      const searchResults = { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
      jest.spyOn(variantSearchService, 'searchVariants').mockResolvedValue(searchResults);

      // Act
      const result = await controller.search(storeId, q, page, limit, rawFilters);

      // Assert
      expect(variantSearchService.searchVariants).toHaveBeenCalledWith('', {
        page: 1,
        limit: 10,
        storeId,
      });
      expect(result).toEqual(searchResults);
    });
  });
}); 