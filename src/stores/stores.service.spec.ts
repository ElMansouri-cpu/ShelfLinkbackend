import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { StoresService } from './stores.service';
import { Store } from './entities/store.entity';
import { User } from '../users/entities/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreSearchService } from './services/store-search.service';
import { CacheService } from '../cache/cache.service';

describe('StoresService', () => {
  let service: StoresService;
  let repository: Repository<Store>;
  let userRepository: Repository<User>;
  let cacheService: CacheService;
  let searchService: StoreSearchService;
  let logger: Logger;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
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
    search: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: getRepositoryToken(Store),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: StoreSearchService,
          useValue: mockSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    repository = module.get<Repository<Store>>(getRepositoryToken(Store));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<StoreSearchService>(StoreSearchService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const userId = 'user-123';
    const storeId = 'store-123';
    const createDto: CreateStoreDto = {
      name: 'Test Store',
      description: 'Test Description',
      url: 'https://teststore.com',
      location: { lat: 40.7128, lng: -74.0060, address: '123 Test St' },
    };
    const updateDto: UpdateStoreDto = {
      name: 'Updated Store',
    };
    const mockStore = {
      id: storeId,
      name: 'Test Store',
      description: 'Test Description',
      url: 'https://teststore.com',
      location: { lat: 40.7128, lng: -74.0060, address: '123 Test St' },
      userId: userId,
      isPrimary: false,
      productsCount: 0,
      ordersCount: 0,
      lastActive: new Date(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    const mockUser = {
      id: userId,
      storeLimit: 5,
    } as any;

    describe('create', () => {
      it('should create a store and sync with cache and search', async () => {
        const createdStore = { ...mockStore, id: storeId };
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.count.mockResolvedValue(0);
        mockRepository.create.mockReturnValue(createdStore);
        mockRepository.save.mockResolvedValue(createdStore);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.create(userId, createDto);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDto,
          userId,
          lastActive: expect.any(Date),
          isPrimary: true,
        });
        expect(mockRepository.save).toHaveBeenCalledWith(createdStore);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${userId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledWith(createdStore);
        expect(mockLogger.log).toHaveBeenCalledWith('Created store', { userId, storeId: createdStore.id });
        expect(result).toEqual(createdStore);
      });

      it('should throw error if user not found', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.create(userId, createDto)).rejects.toThrow('User not found');
      });

      it('should throw error if store limit reached', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.count.mockResolvedValue(5); // User has 5 stores, limit is 5

        await expect(service.create(userId, createDto)).rejects.toThrow('You have reached your store limit of 5');
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedStores = [mockStore];
        mockCacheService.get.mockResolvedValue(cachedStores);

        const result = await service.findAll(userId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${userId}:entity:{}`);
        expect(result).toEqual(cachedStores);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const stores = [mockStore];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(stores);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(userId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { userId },
          order: { isPrimary: 'DESC', lastActive: 'DESC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${userId}:entity:{}`, stores);
        expect(result).toEqual(stores);
      });
    });

    describe('findOne', () => {
      it('should return a store by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockStore);

        const result = await service.findOne(userId, storeId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: storeId, userId } });
        expect(result).toEqual(mockStore);
      });

      it('should throw NotFoundException if store not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(userId, storeId)).rejects.toThrow('Store not found');
      });
    });

    describe('update', () => {
      it('should update a store and sync with cache and search', async () => {
        const updatedStore = { ...mockStore, name: 'Updated Store' };
        mockRepository.findOne.mockResolvedValue(mockStore);
        mockRepository.save.mockResolvedValue(updatedStore);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.update(userId, storeId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedStore);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${userId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedStore);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated store', { userId, id: storeId, storeId: updatedStore.id });
        expect(result).toEqual(updatedStore);
        expect(result.lastActive).toBeInstanceOf(Date);
      });
    });

    describe('delete', () => {
      it('should delete a store and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockStore);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.remove.mockResolvedValue(undefined);

        await service.delete(userId, storeId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockStore);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${userId}:*`);
        expect(mockSearchService.remove).toHaveBeenCalledWith(userId, storeId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted store', { userId, id: storeId });
      });

      it('should throw error if store has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockStore);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 categories
        });

        await expect(service.delete(userId, storeId)).rejects.toThrow('Store has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for stores without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('user-123', 'store-123');

      expect(result).toBe(false);
    });

    it('should return true for stores with categories', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkAssociations('user-123', 'store-123');

      expect(result).toBe(true);
    });
  });

  describe('Entity-specific methods', () => {
    const userId = 'user-123';
    const storeId = 'store-123';
    const mockStore = {
      id: storeId,
      name: 'Test Store',
      isPrimary: false,
      lastActive: new Date(),
      productsCount: 10,
      ordersCount: 5,
    } as any;

    describe('setPrimary', () => {
      it('should set a store as primary and unset others', async () => {
        const updatedStore = { ...mockStore, isPrimary: true };
        mockRepository.update.mockResolvedValue(undefined);
        mockRepository.findOne.mockResolvedValue(mockStore);
        mockRepository.save.mockResolvedValue(updatedStore);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.setPrimary(storeId, userId);

        expect(mockRepository.update).toHaveBeenCalledWith(
          { userId, isPrimary: true },
          { isPrimary: false }
        );
        expect(mockRepository.save).toHaveBeenCalledWith({ ...mockStore, isPrimary: true });
        expect(result).toEqual(updatedStore);
      });
    });

    describe('updateLastActive', () => {
      it('should update last active timestamp', async () => {
        const updatedStore = { ...mockStore, lastActive: new Date() };
        mockRepository.findOne.mockResolvedValue(mockStore);
        mockRepository.save.mockResolvedValue(updatedStore);

        const result = await service.updateLastActive(storeId, userId);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedStore);
        expect(result).toEqual(updatedStore);
      });
    });

    describe('getStoreStatistics', () => {
      it('should return store statistics', async () => {
        const mockUser = { storeLimit: 5 };
        const primaryStore = { ...mockStore, isPrimary: true };
        const lastActiveStore = { ...mockStore, lastActive: new Date() };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.count.mockResolvedValue(3);
        mockRepository.findOne
          .mockResolvedValueOnce(primaryStore)
          .mockResolvedValueOnce(lastActiveStore);

        const result = await service.getStoreStatistics(userId);

        expect(result).toEqual({
          totalStores: 3,
          primaryStore,
          lastActiveStore,
          storeLimit: 5,
          remainingSlots: 2,
        });
      });
    });

    describe('getRecentStores', () => {
      it('should return recent stores', async () => {
        const recentStores = [mockStore];
        mockRepository.find.mockResolvedValue(recentStores);

        const result = await service.getRecentStores(userId, 5);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { userId },
          order: { lastActive: 'DESC' },
          take: 5,
        });
        expect(result).toEqual(recentStores);
      });
    });

    describe('searchStores', () => {
      it('should search stores by name, description, or URL', async () => {
        const searchResults = [mockStore];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(searchResults),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.searchStores(userId, 'test');

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          '(store.name ILIKE :search OR store.description ILIKE :search OR store.url ILIKE :search)',
          { search: '%test%' }
        );
        expect(result).toEqual(searchResults);
      });
    });

    describe('getStorePerformance', () => {
      it('should return store performance metrics', async () => {
        mockRepository.findOne.mockResolvedValue(mockStore);

        const result = await service.getStorePerformance(storeId, userId);

        expect(result).toEqual({
          orders: 5,
          revenue: 0,
          products: 10,
          lastOrderDate: mockStore.lastActive,
        });
      });
    });

    describe('getAllStores', () => {
      it('should return all stores', async () => {
        const allStores = [mockStore];
        mockRepository.find.mockResolvedValue(allStores);

        const result = await service.getAllStores();

        expect(mockRepository.find).toHaveBeenCalledWith({
          order: { createdAt: 'DESC' },
        });
        expect(result).toEqual(allStores);
      });
    });
  });

  describe('query', () => {
    it('should build query with filters and sorts', async () => {
      const queryDto = {
        filters: [
          { column: 'name', operator: 'contains', value: 'test' },
          { column: 'status', operator: 'equals', value: 'active' },
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

      await service.query('user-123', queryDto, 'user-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('store.userId = :userId', { userId: 'user-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
}); 