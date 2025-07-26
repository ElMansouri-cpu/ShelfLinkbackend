import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderSearchService } from './services/provider-search.service';
import { CacheService } from '../cache/cache.service';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let repository: Repository<Provider>;
  let cacheService: CacheService;
  let searchService: ProviderSearchService;
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
        ProvidersService,
        {
          provide: getRepositoryToken(Provider),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ProviderSearchService,
          useValue: mockSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    repository = module.get<Repository<Provider>>(getRepositoryToken(Provider));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<ProviderSearchService>(ProviderSearchService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const storeId = 'store-123';
    const providerId = '1';
    const createDto: CreateProviderDto = {
      name: 'Test Provider',
      email: 'test@provider.com',
      phoneNumber: '+1234567890',
      address: '123 Test St',
      storeId: storeId,
    };
    const updateDto: UpdateProviderDto = {
      name: 'Updated Provider',
    };
    const mockProvider = {
      id: 1,
      name: 'Test Provider',
      email: 'test@provider.com',
      phoneNumber: '+1234567890',
      address: '123 Test St',
      storeId: storeId,
      location: '(0,0)',
      userId: 'user-123',
      contactInfo: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    describe('create', () => {
      it('should create a provider and sync with cache and search', async () => {
        const createdProvider = { ...mockProvider, id: 1 };
        mockRepository.create.mockReturnValue(createdProvider);
        mockRepository.save.mockResolvedValue(createdProvider);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.create(storeId, createDto);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDto,
          storeId,
          location: '(0,0)',
        });
        expect(mockRepository.save).toHaveBeenCalledWith(createdProvider);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledWith(createdProvider);
        expect(mockLogger.log).toHaveBeenCalledWith('Created provider', { storeId, providerId: createdProvider.id });
        expect(result).toEqual(createdProvider);
      });

      it('should handle location coordinates when provided', async () => {
        const createDtoWithLocation = { ...createDto, latitude: 40.7128, longitude: -74.0060 };
        const createdProvider = { ...mockProvider, id: 1 };
        mockRepository.create.mockReturnValue(createdProvider);
        mockRepository.save.mockResolvedValue(createdProvider);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        await service.create(storeId, createDtoWithLocation);

        const { latitude, longitude, ...expectedDto } = createDtoWithLocation;
        expect(mockRepository.create).toHaveBeenCalledWith({
          ...expectedDto,
          storeId,
          location: '(-74.006,40.7128)',
        });
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedProviders = [mockProvider];
        mockCacheService.get.mockResolvedValue(cachedProviders);

        const result = await service.findAll(storeId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${storeId}:entity:{}`);
        expect(result).toEqual(cachedProviders);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const providers = [mockProvider];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(providers);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(storeId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { name: 'ASC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${storeId}:entity:{}`, providers);
        expect(result).toEqual(providers);
      });
    });

    describe('findOne', () => {
      it('should return a provider by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockProvider);

        const result = await service.findOne(storeId, providerId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, storeId } });
        expect(result).toEqual(mockProvider);
      });

      it('should throw NotFoundException if provider not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(storeId, providerId)).rejects.toThrow('Provider #1 not found');
      });
    });

    describe('update', () => {
      it('should update a provider and sync with cache and search', async () => {
        const updatedProvider = { ...mockProvider, name: 'Updated Provider' };
        mockRepository.findOne.mockResolvedValue(mockProvider);
        mockRepository.save.mockResolvedValue(updatedProvider);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.update(storeId, providerId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedProvider);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedProvider);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated provider', { storeId, id: providerId, providerId: updatedProvider.id });
        expect(result).toEqual(updatedProvider);
      });

      it('should handle location update when coordinates are provided', async () => {
        const updateDtoWithLocation = { ...updateDto, latitude: 40.7128, longitude: -74.0060 };
        const updatedProvider = { ...mockProvider, name: 'Updated Provider', location: '(-74.006,40.7128)' };
        mockRepository.findOne.mockResolvedValue(mockProvider);
        mockRepository.save.mockResolvedValue(updatedProvider);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        await service.update(storeId, providerId, updateDtoWithLocation);

        expect(mockRepository.save).toHaveBeenCalledWith({
          ...mockProvider,
          name: 'Updated Provider',
          location: '(-74.006,40.7128)',
        });
      });
    });

    describe('delete', () => {
      it('should delete a provider and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockProvider);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.remove.mockResolvedValue(undefined);

        await service.delete(storeId, providerId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockProvider);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.remove).toHaveBeenCalledWith(storeId, providerId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted provider', { storeId, id: providerId });
      });

      it('should throw error if provider has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockProvider);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 variants
        });

        await expect(service.delete(storeId, providerId)).rejects.toThrow('Provider has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for providers without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(false);
    });

    it('should return true for providers with variants', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(true);
    });

    it('should return true for providers with orders', async () => {
      // Mock first query (variants) to return 0
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      
      // Mock second query (orders) to return 2
      const mockOrderQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };

      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockOrderQueryBuilder);

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(true);
    });
  });

  describe('Entity-specific methods', () => {
    const storeId = 'store-123';
    const mockProvider = {
      id: 1,
      name: 'Test Provider',
      email: 'test@provider.com',
      phoneNumber: '+1234567890',
      storeId,
    } as any;

    describe('textSearchProviders', () => {
      it('should search providers by name, email, or phone number', async () => {
        const searchResults = [mockProvider];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(searchResults),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.textSearchProviders(storeId, 'test');

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          '(provider.name ILIKE :search OR provider.email ILIKE :search OR provider.phoneNumber ILIKE :search)',
          { search: '%test%' }
        );
        expect(result).toEqual(searchResults);
      });
    });

    describe('findNearbyProviders', () => {
      it('should find providers within specified radius', async () => {
        const nearbyProviders = [mockProvider];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(nearbyProviders),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.findNearbyProviders(storeId, 40.7128, -74.0060, 10);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ST_DWithin(provider.location::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)',
          { longitude: -74.0060, latitude: 40.7128, radius: 10000 }
        );
        expect(result).toEqual(nearbyProviders);
      });
    });

    describe('getProviderStatistics', () => {
      it('should return provider statistics', async () => {
        const topProvider = { ...mockProvider, createdAt: new Date() };
        mockRepository.count
          .mockResolvedValueOnce(5) // totalProviders
          .mockResolvedValueOnce(5); // activeProviders (same as total)
        mockRepository.findOne.mockResolvedValue(topProvider);

        const result = await service.getProviderStatistics(storeId);

        expect(result).toEqual({
          totalProviders: 5,
          activeProviders: 5,
          averageRating: 0,
          topRatedProvider: topProvider,
        });
      });
    });

    describe('getProvidersByStatus', () => {
      it('should return active providers', async () => {
        const activeProviders = [mockProvider];
        mockRepository.find.mockResolvedValue(activeProviders);

        const result = await service.getProvidersByStatus(storeId, 'active');

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { name: 'ASC' },
        });
        expect(result).toEqual(activeProviders);
      });

      it('should return empty array for inactive providers', async () => {
        const result = await service.getProvidersByStatus(storeId, 'inactive');

        expect(result).toEqual([]);
      });
    });

    describe('getTopRatedProviders', () => {
      it('should return top rated providers (recent providers)', async () => {
        const topProviders = [mockProvider];
        mockRepository.find.mockResolvedValue(topProviders);

        const result = await service.getTopRatedProviders(storeId, 10);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { createdAt: 'DESC' },
          take: 10,
        });
        expect(result).toEqual(topProviders);
      });
    });

    describe('updateProviderRating', () => {
      it('should return provider without updating rating (no rating field)', async () => {
        mockRepository.findOne.mockResolvedValue(mockProvider);

        const result = await service.updateProviderRating(1, storeId, 4.5);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, storeId } });
        expect(result).toEqual(mockProvider);
      });
    });
  });

  describe('query', () => {
    it('should build query with filters and sorts', async () => {
      const queryDto = {
        filters: [
          { column: 'name', operator: 'contains', value: 'test' },
          { column: 'email', operator: 'equals', value: 'test@provider.com' },
        ],
        sorts: [
          { column: 'name', direction: 'ASC' },
          { column: 'createdAt', direction: 'DESC' },
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

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('provider.storeId = :storeId', { storeId: 'store-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
}); 