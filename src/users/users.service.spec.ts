import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchService } from './services/user-search.service';
import { CacheService } from '../cache/cache.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole } from './enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let cacheService: CacheService;
  let searchService: UserSearchService;
  let logger: Logger;
  let supabaseService: SupabaseService;

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
    search: jest.fn(),
    reindexByUser: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: UserSearchService,
          useValue: mockSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<UserSearchService>(UserSearchService);
    logger = module.get<Logger>(Logger);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const storeId = 'store-123';
    const userId = 'user-123';
    const updateDto: UpdateUserDto = {
      username: 'Updated User',
    };
    const mockUser = {
      id: userId,
      username: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      role: UserRole.CLIENT,
      storeLimit: 2,
      subscriptionTier: 'basic',
      user_metadata: {},
      app_metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    describe('create', () => {
      it('should throw error for direct user creation', async () => {
        await expect(service.create(storeId, {})).rejects.toThrow('Users should be created through Supabase authentication');
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedUsers = [mockUser];
        mockCacheService.get.mockResolvedValue(cachedUsers);

        const result = await service.findAll(storeId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${storeId}:entity:{}`);
        expect(result).toEqual(cachedUsers);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const users = [mockUser];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(users);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(storeId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          order: { createdAt: 'DESC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${storeId}:entity:{}`, users);
        expect(result).toEqual(users);
      });
    });

    describe('findOne', () => {
      it('should return a user by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findOne(storeId, userId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
        expect(result).toEqual(mockUser);
      });

      it('should throw NotFoundException if user not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(storeId, userId)).rejects.toThrow('User not found');
      });
    });

    describe('update', () => {
      it('should update a user and sync with cache and search', async () => {
        const updatedUser = { ...mockUser, username: 'Updated User' };
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.update(storeId, userId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedUser);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedUser);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated user', { storeId, id: userId, userId: updatedUser.id });
        expect(result).toEqual(updatedUser);
      });
    });

    describe('delete', () => {
      it('should delete a user and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.remove.mockResolvedValue(undefined);

        await service.delete(storeId, userId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.remove).toHaveBeenCalledWith(storeId, userId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted user', { storeId, id: userId });
      });

      it('should throw error if user has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 stores
        });

        await expect(service.delete(storeId, userId)).rejects.toThrow('User has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for users without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('store-123', 'user-123');

      expect(result).toBe(false);
    });

    it('should return true for users with stores', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkAssociations('store-123', 'user-123');

      expect(result).toBe(true);
    });
  });

  describe('Entity-specific methods', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      username: 'Test User',
      email: 'test@example.com',
      role: UserRole.CLIENT,
      subscriptionTier: 'basic',
      storeLimit: 2,
      stores: [],
      createdAt: new Date(),
      user_metadata: {},
    } as any;

    describe('findById', () => {
      it('should return cached user if available', async () => {
        mockCacheService.get.mockResolvedValue(mockUser);

        const result = await service.findById(userId);

        expect(mockCacheService.get).toHaveBeenCalledWith(`user:${userId}:profile`);
        expect(result).toEqual(mockUser);
      });

      it('should fetch from database and cache if not cached', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findById(userId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
        expect(mockCacheService.set).toHaveBeenCalledWith(`user:${userId}:profile`, mockUser);
        expect(result).toEqual(mockUser);
      });

      it('should throw NotFoundException if user not found', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findById(userId)).rejects.toThrow('User not found');
      });
    });

    describe('findByEmail', () => {
      it('should return cached user if available', async () => {
        mockCacheService.get.mockResolvedValue(mockUser);

        const result = await service.findByEmail('test@example.com');

        expect(mockCacheService.get).toHaveBeenCalledWith(`user:email:test@example.com`);
        expect(result).toEqual(mockUser);
      });

      it('should return null if user not found', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.findOne.mockResolvedValue(null);

        const result = await service.findByEmail('nonexistent@example.com');

        expect(result).toBeNull();
      });
    });

    describe('findByIdWithStores', () => {
      it('should return user with stores relation', async () => {
        const userWithStores = { ...mockUser, stores: [{ id: 'store-1' }] };
        mockCacheService.get.mockResolvedValue(userWithStores);

        const result = await service.findByIdWithStores(userId);

        expect(mockCacheService.get).toHaveBeenCalledWith(`user:${userId}:with_stores`);
        expect(result).toEqual(userWithStores);
      });
    });

    describe('syncUserFromSupabase', () => {
      it('should create new user from Supabase data', async () => {
        const supabaseUser = {
          id: userId,
          email: 'new@example.com',
          phone: '+1234567890',
          user_metadata: { username: 'New User' },
          app_metadata: {},
        };

        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.syncUserFromSupabase(supabaseUser);

        expect(mockRepository.create).toHaveBeenCalledWith({
          id: userId,
          email: 'new@example.com',
          phone: '+1234567890',
          username: 'New User',
          user_metadata: { username: 'New User' },
          app_metadata: {},
          storeLimit: 2,
          subscriptionTier: 'basic',
        });
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`user:${userId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledWith(mockUser);
        expect(result).toEqual(mockUser);
      });

      it('should update existing user from Supabase data', async () => {
        const supabaseUser = {
          id: userId,
          email: 'updated@example.com',
          phone: '+0987654321',
          user_metadata: { username: 'Updated User' },
          app_metadata: {},
        };

        const existingUser = { ...mockUser };
        mockRepository.findOne.mockResolvedValue(existingUser);
        mockRepository.save.mockResolvedValue(existingUser);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.syncUserFromSupabase(supabaseUser);

        expect(existingUser.email).toBe('updated@example.com');
        expect(existingUser.phone).toBe('+0987654321');
        expect(existingUser.username).toBe('Updated User');
        expect(result).toEqual(existingUser);
      });
    });

    describe('updateUserMetadata', () => {
      it('should update user metadata', async () => {
        const metadata = { theme: 'dark', language: 'en' };
        const updatedUser = { ...mockUser, user_metadata: metadata };

        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.updateUserMetadata(userId, metadata);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedUser);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`user:${userId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedUser);
        expect(result).toEqual(updatedUser);
      });
    });

    describe('updateStoreLimit', () => {
      it('should update user store limit', async () => {
        const updatedUser = { ...mockUser, storeLimit: 5 };
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.updateStoreLimit(userId, 5);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedUser);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`user:${userId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedUser);
        expect(result).toEqual(updatedUser);
      });
    });

    describe('updateSubscriptionTier', () => {
      it('should update user subscription tier', async () => {
        const updatedUser = { ...mockUser, subscriptionTier: 'premium' };
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.updateSubscriptionTier(userId, 'premium');

        expect(mockRepository.save).toHaveBeenCalledWith(updatedUser);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`user:${userId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedUser);
        expect(result).toEqual(updatedUser);
      });
    });

    describe('getUserStatistics', () => {
      it('should return user statistics', async () => {
        const userWithStores = { ...mockUser, stores: [{ id: 'store-1' }, { id: 'store-2' }] };
        mockRepository.findOne.mockResolvedValue(userWithStores);

        const result = await service.getUserStatistics(userId);

        expect(result).toEqual({
          totalStores: 2,
          totalOrders: 0,
          subscriptionTier: 'basic',
          accountAge: expect.any(Number),
          lastLoginDate: null,
        });
      });
    });

    describe('getUsersBySubscriptionTier', () => {
      it('should return users by subscription tier', async () => {
        const users = [mockUser];
        mockRepository.find.mockResolvedValue(users);

        const result = await service.getUsersBySubscriptionTier('basic');

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { subscriptionTier: 'basic' },
          order: { createdAt: 'DESC' },
        });
        expect(result).toEqual(users);
      });
    });

    describe('searchUsers', () => {
      it('should search users by name, email, or phone', async () => {
        const users = [mockUser];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(users),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.searchUsers('test', 20);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          '(user.username ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
          { search: '%test%' }
        );
        expect(result).toEqual(users);
      });
    });

    describe('getUsersByRole', () => {
      it('should return users by role', async () => {
        const users = [mockUser];
        mockRepository.find.mockResolvedValue(users);

        const result = await service.getUsersByRole(UserRole.CLIENT);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { role: UserRole.CLIENT },
          order: { createdAt: 'DESC' },
        });
        expect(result).toEqual(users);
      });
    });

    describe('getRecentUsers', () => {
      it('should return recent users', async () => {
        const users = [mockUser];
        mockRepository.find.mockResolvedValue(users);

        const result = await service.getRecentUsers(10);

        expect(mockRepository.find).toHaveBeenCalledWith({
          order: { createdAt: 'DESC' },
          take: 10,
        });
        expect(result).toEqual(users);
      });
    });

    describe('reindexUser', () => {
      it('should reindex user in Elasticsearch', async () => {
        mockSearchService.reindexByUser.mockResolvedValue(undefined);

        await service.reindexUser(userId);

        expect(mockSearchService.reindexByUser).toHaveBeenCalledWith(userId);
        expect(mockLogger.log).toHaveBeenCalledWith(`Successfully reindexed user ${userId}`);
      });

      it('should handle reindex errors', async () => {
        const error = new Error('Reindex failed');
        mockSearchService.reindexByUser.mockRejectedValue(error);

        await expect(service.reindexUser(userId)).rejects.toThrow('Reindex failed');
        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to reindex user ${userId}:`, error);
      });
    });
  });

  describe('query', () => {
    it('should build query with filters and sorts', async () => {
      const queryDto = {
        filters: [
          { column: 'username', operator: 'contains', value: 'test' },
          { column: 'role', operator: 'equals', value: UserRole.CLIENT },
        ],
        sorts: [
          { column: 'username', direction: 'ASC' },
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

      await service.query('store-123', queryDto, 'store-123');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
});
