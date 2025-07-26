import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { VariantTaxesService } from './variant-taxes.service';
import { Tax } from '../entities/tax.entity';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { TaxSearchService } from './tax-search.service';
import { VariantSearchService } from './variant-search.service';
import { CacheService } from '../../cache/cache.service';

describe('VariantTaxesService', () => {
  let service: VariantTaxesService;
  let repository: Repository<Tax>;
  let cacheService: CacheService;
  let taxSearchService: TaxSearchService;
  let variantSearchService: VariantSearchService;
  let logger: Logger;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidatePattern: jest.fn(),
  };

  const mockTaxSearchService = {
    index: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    search: jest.fn(),
    reindexByStore: jest.fn(),
  };

  const mockVariantSearchService = {
    reindexVariantsByTax: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantTaxesService,
        {
          provide: getRepositoryToken(Tax),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: TaxSearchService,
          useValue: mockTaxSearchService,
        },
        {
          provide: VariantSearchService,
          useValue: mockVariantSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<VariantTaxesService>(VariantTaxesService);
    repository = module.get<Repository<Tax>>(getRepositoryToken(Tax));
    cacheService = module.get<CacheService>(CacheService);
    taxSearchService = module.get<TaxSearchService>(TaxSearchService);
    variantSearchService = module.get<VariantSearchService>(VariantSearchService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const storeId = 'store-123';
    const taxId = 'tax-123';
    const createDto: CreateTaxDto = {
      name: 'VAT',
      rate: 20,
      isActive: true,
    };
    const updateDto: UpdateTaxDto = {
      name: 'Updated VAT',
      rate: 25,
    };
    const mockTax = {
      id: taxId,
      name: 'VAT',
      rate: 20,
      storeId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    describe('create', () => {
      it('should create a tax and sync with cache and search', async () => {
        mockRepository.create.mockReturnValue(mockTax);
        mockRepository.save.mockResolvedValue(mockTax);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockTaxSearchService.index.mockResolvedValue(undefined);

        const result = await service.create(storeId, createDto);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDto,
          storeId,
        });
        expect(mockRepository.save).toHaveBeenCalledWith(mockTax);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockTaxSearchService.index).toHaveBeenCalledWith(mockTax);
        expect(mockLogger.log).toHaveBeenCalledWith('Created tax', { storeId, id: mockTax.id });
        expect(result).toEqual(mockTax);
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedTaxes = [mockTax];
        mockCacheService.get.mockResolvedValue(cachedTaxes);

        const result = await service.findAll(storeId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${storeId}:entity:{}`);
        expect(result).toEqual(cachedTaxes);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const taxes = [mockTax];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(taxes);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(storeId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId, ...{} },
          order: { createdAt: 'DESC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${storeId}:entity:{}`, taxes);
        expect(result).toEqual(taxes);
      });
    });

    describe('findOne', () => {
      it('should return a tax by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockTax);

        const result = await service.findOne(storeId, taxId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: taxId, storeId } });
        expect(result).toEqual(mockTax);
      });

      it('should throw error if tax not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(storeId, taxId)).rejects.toThrow('Tax not found');
      });
    });

    describe('update', () => {
      it('should update a tax and sync with cache and search', async () => {
        const updatedTax = { ...mockTax, name: 'Updated VAT', rate: 25 };
        mockRepository.findOne.mockResolvedValue(mockTax);
        mockRepository.save.mockResolvedValue(updatedTax);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockTaxSearchService.index.mockResolvedValue(undefined);
        mockVariantSearchService.reindexVariantsByTax.mockResolvedValue(undefined);

        const result = await service.update(storeId, taxId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedTax);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockTaxSearchService.index).toHaveBeenCalledWith(updatedTax);
        expect(mockVariantSearchService.reindexVariantsByTax).toHaveBeenCalledWith(taxId);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated tax', { storeId, id: taxId, taxId: updatedTax.id });
        expect(result).toEqual(updatedTax);
      });
    });

    describe('delete', () => {
      it('should delete a tax and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockTax);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockTaxSearchService.remove.mockResolvedValue(undefined);

        await service.delete(storeId, taxId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockTax);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockTaxSearchService.remove).toHaveBeenCalledWith(storeId, taxId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted tax', { storeId, id: taxId });
      });

      it('should throw error if tax has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockTax);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 variants
        });

        await expect(service.delete(storeId, taxId)).rejects.toThrow('Tax has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for taxes without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('store-123', 'tax-123');

      expect(result).toBe(false);
    });

    it('should return true for taxes with variants', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkAssociations('store-123', 'tax-123');

      expect(result).toBe(true);
    });
  });

  describe('Entity-specific methods', () => {
    const storeId = 'store-123';
    const mockTax = {
      id: 'tax-123',
      name: 'VAT',
      rate: 20,
      storeId,
      isActive: true,
    } as any;

    describe('findByName', () => {
      it('should return tax by name', async () => {
        mockRepository.findOne.mockResolvedValue(mockTax);

        const result = await service.findByName(storeId, 'VAT');

        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { storeId, name: 'VAT' },
        });
        expect(result).toEqual(mockTax);
      });

      it('should return null if tax not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        const result = await service.findByName(storeId, 'Non-existent Tax');

        expect(result).toBeNull();
      });
    });

    describe('getActiveTaxes', () => {
      it('should return active taxes', async () => {
        const taxes = [mockTax];
        mockRepository.find.mockResolvedValue(taxes);

        const result = await service.getActiveTaxes(storeId);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId, isActive: true },
          order: { rate: 'ASC' },
        });
        expect(result).toEqual(taxes);
      });
    });

    describe('getTaxStatistics', () => {
      it('should return tax statistics', async () => {
        const taxes = [
          { ...mockTax, rate: 20 },
          { ...mockTax, id: 'tax-456', rate: 10 },
          { ...mockTax, id: 'tax-789', rate: 30, isActive: false },
        ];
        mockRepository.find.mockResolvedValue(taxes);

        const result = await service.getTaxStatistics(storeId);

        expect(result).toEqual({
          totalTaxes: 3,
          activeTaxes: 2,
          averageRate: 20,
          highestRate: 30,
          lowestRate: 10,
        });
      });
    });

    describe('searchTaxes', () => {
      it('should search taxes by name', async () => {
        const taxes = [mockTax];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(taxes),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.searchTaxes(storeId, 'VAT', 20);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith('tax.storeId = :storeId', { storeId });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tax.name ILIKE :search', { search: '%VAT%' });
        expect(result).toEqual(taxes);
      });
    });

    describe('toggleActive', () => {
      it('should toggle tax active status', async () => {
        const updatedTax = { ...mockTax, isActive: false };
        mockRepository.findOne.mockResolvedValue(mockTax);
        mockRepository.save.mockResolvedValue(updatedTax);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockTaxSearchService.index.mockResolvedValue(undefined);

        const result = await service.toggleActive(storeId, 'tax-123');

        expect(mockRepository.save).toHaveBeenCalledWith(updatedTax);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockTaxSearchService.index).toHaveBeenCalledWith(updatedTax);
        expect(mockLogger.log).toHaveBeenCalledWith('Toggled tax active status', { storeId, id: 'tax-123', isActive: false });
        expect(result).toEqual(updatedTax);
      });
    });

    describe('reindexStore', () => {
      it('should reindex taxes for a store', async () => {
        mockTaxSearchService.reindexByStore.mockResolvedValue(undefined);

        await service.reindexStore(storeId);

        expect(mockTaxSearchService.reindexByStore).toHaveBeenCalledWith(storeId);
        expect(mockLogger.log).toHaveBeenCalledWith(`Successfully reindexed taxes for store ${storeId}`);
      });

      it('should handle reindex errors', async () => {
        const error = new Error('Reindex failed');
        mockTaxSearchService.reindexByStore.mockRejectedValue(error);

        await expect(service.reindexStore(storeId)).rejects.toThrow('Reindex failed');
        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to reindex taxes for store ${storeId}:`, error);
      });
    });
  });
}); 