import { Test, TestingModule } from '@nestjs/testing';
import { BaseEntityService } from './base-entity.service';
import { CacheService } from '../../cache/cache.service';
import { Logger } from '@nestjs/common';

// Create a concrete implementation for testing
class TestEntity {
  id: string;
  name: string;
  storeId: string;
}

class TestCreateDto {
  name: string;
}

class TestUpdateDto {
  name: string;
}

class TestSearchService {
  index = jest.fn();
  search = jest.fn();
  findById = jest.fn();
  update = jest.fn();
  remove = jest.fn();
}

class TestRepository {
  create = jest.fn();
  save = jest.fn();
  find = jest.fn();
  findOne = jest.fn();
  update = jest.fn();
  delete = jest.fn();
}

class TestEntityService extends BaseEntityService<TestEntity, TestCreateDto, TestUpdateDto> {
  constructor(
    dbRepo: TestRepository,
    cacheService: CacheService,
    searchService: TestSearchService,
    logger: Logger,
  ) {
    super(dbRepo, cacheService, searchService, logger);
  }

  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Mock implementation - return false for testing
    return false;
  }
}

describe('BaseEntityService', () => {
  let service: TestEntityService;
  let repository: TestRepository;
  let cacheService: CacheService;
  let searchService: TestSearchService;
  let logger: Logger;

  const mockEntity: TestEntity = {
    id: '1',
    name: 'Test Entity',
    storeId: 'store-1',
  };

  const mockCreateDto: TestCreateDto = {
    name: 'New Entity',
  };

  const mockUpdateDto: TestUpdateDto = {
    name: 'Updated Entity',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestEntityService,
        {
          provide: TestRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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
          provide: TestSearchService,
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

    service = module.get<TestEntityService>(TestEntityService);
    repository = module.get<TestRepository>(TestRepository);
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<TestSearchService>(TestSearchService);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create entity, invalidate cache, and index in search', async () => {
      // Arrange
      const storeId = 'store-1';
      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);
      jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(1);
      jest.spyOn(searchService, 'index').mockResolvedValue({});

      // Act
      const result = await service.create(storeId, mockCreateDto);

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateDto,
        storeId,
      });
      expect(repository.save).toHaveBeenCalledWith(mockEntity);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
      expect(searchService.index).toHaveBeenCalledWith(mockEntity);
      expect(logger.log).toHaveBeenCalledWith('Created entity', {
        storeId,
        entity: mockEntity,
      });
      expect(result).toEqual(mockEntity);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const storeId = 'store-1';
      const error = new Error('Database error');
      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockRejectedValue(error);

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
      const cachedResults = [mockEntity];
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
      const searchResults = [mockEntity];
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
    it('should return entity by ID from search service', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      jest.spyOn(searchService, 'findById').mockResolvedValue(mockEntity);

      // Act
      const result = await service.findOne(storeId, id);

      // Assert
      expect(searchService.findById).toHaveBeenCalledWith(storeId, id);
      expect(result).toEqual(mockEntity);
    });

    it('should return null if entity not found', async () => {
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
    it('should update entity, invalidate cache, and update search', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';
      const updatedEntity = { ...mockEntity, ...mockUpdateDto };
      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(repository, 'findOne').mockResolvedValue(updatedEntity);
      jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(1);
      jest.spyOn(searchService, 'update').mockResolvedValue({});

      // Act
      const result = await service.update(storeId, id, mockUpdateDto);

      // Assert
      expect(repository.update).toHaveBeenCalledWith({ id, storeId }, mockUpdateDto);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
      expect(searchService.update).toHaveBeenCalledWith(updatedEntity);
      expect(logger.log).toHaveBeenCalledWith('Updated entity', {
        storeId,
        id,
        entity: updatedEntity,
      });
      expect(result).toEqual(updatedEntity);
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
    it('should delete entity, invalidate cache, and remove from search', async () => {
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
      expect(repository.delete).toHaveBeenCalledWith({ id, storeId });
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
      expect(searchService.remove).toHaveBeenCalledWith(storeId, id);
      expect(logger.log).toHaveBeenCalledWith('Deleted entity', { storeId, id });
    });

    it('should throw error if entity has associations', async () => {
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
    it('should be implemented by subclass', async () => {
      // Arrange
      const storeId = 'store-1';
      const id = '1';

      // Act
      const result = await service.checkAssociations(storeId, id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cache key generation', () => {
    it('should generate proper cache keys', async () => {
      // Arrange
      const storeId = 'store-1';
      const query = { page: 1, limit: 10, filter: 'test' };

      // Act
      const result = await service.findAll(storeId, query);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith(
        `store:${storeId}:entity:${JSON.stringify(query)}`
      );
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

  describe('protected methods', () => {
    it('should invalidate cache with correct pattern', async () => {
      // Arrange
      const storeId = 'store-1';
      jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(1);

      // Act
      await service.create(storeId, mockCreateDto);

      // Assert
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
    });
  });
}); 