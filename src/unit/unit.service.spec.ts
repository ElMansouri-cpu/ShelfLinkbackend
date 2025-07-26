import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UnitsService } from './unit.service';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitSearchService } from './services/unit-search.service';
import { CacheService } from '../cache/cache.service';

describe('UnitsService', () => {
  let service: UnitsService;
  let repository: Repository<Unit>;
  let cacheService: CacheService;
  let searchService: UnitSearchService;
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
    search: jest.fn(),
    reindexByStore: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        {
          provide: getRepositoryToken(Unit),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: UnitSearchService,
          useValue: mockSearchService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    repository = module.get<Repository<Unit>>(getRepositoryToken(Unit));
    cacheService = module.get<CacheService>(CacheService);
    searchService = module.get<UnitSearchService>(UnitSearchService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    const storeId = 'store-123';
    const unitId = '1';
    const createDto: CreateUnitDto = {
      name: 'Test Unit',
      description: 'Test Description',
    };
    const updateDto: UpdateUnitDto = {
      name: 'Updated Unit',
    };
    const mockUnit = {
      id: 1,
      name: 'Test Unit',
      description: 'Test Description',
      storeId: storeId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    describe('create', () => {
      it('should create a unit and sync with cache and search', async () => {
        const createdUnit = { ...mockUnit, id: 1 };
        mockRepository.create.mockReturnValue(createdUnit);
        mockRepository.save.mockResolvedValue(createdUnit);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.create(storeId, createDto);

        expect(mockRepository.create).toHaveBeenCalledWith({
          ...createDto,
          storeId,
        });
        expect(mockRepository.save).toHaveBeenCalledWith(createdUnit);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledWith(createdUnit);
        expect(mockLogger.log).toHaveBeenCalledWith('Created unit', { storeId, unitId: createdUnit.id });
        expect(result).toEqual(createdUnit);
      });
    });

    describe('findAll', () => {
      it('should return cached results if available', async () => {
        const cachedUnits = [mockUnit];
        mockCacheService.get.mockResolvedValue(cachedUnits);

        const result = await service.findAll(storeId, {});

        expect(mockCacheService.get).toHaveBeenCalledWith(`store:${storeId}:entity:{}`);
        expect(result).toEqual(cachedUnits);
      });

      it('should fetch from database and cache results if not cached', async () => {
        const units = [mockUnit];
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.find.mockResolvedValue(units);
        mockCacheService.set.mockResolvedValue(undefined);

        const result = await service.findAll(storeId, {});

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId },
          order: { name: 'ASC' },
        });
        expect(mockCacheService.set).toHaveBeenCalledWith(`store:${storeId}:entity:{}`, units);
        expect(result).toEqual(units);
      });
    });

    describe('findOne', () => {
      it('should return a unit by ID', async () => {
        mockRepository.findOne.mockResolvedValue(mockUnit);

        const result = await service.findOne(storeId, unitId);

        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, storeId } });
        expect(result).toEqual(mockUnit);
      });

      it('should throw NotFoundException if unit not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(storeId, unitId)).rejects.toThrow('Unit not found');
      });
    });

    describe('update', () => {
      it('should update a unit and sync with cache and search', async () => {
        const updatedUnit = { ...mockUnit, name: 'Updated Unit' };
        mockRepository.findOne.mockResolvedValue(mockUnit);
        mockRepository.save.mockResolvedValue(updatedUnit);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.update(storeId, unitId, updateDto);

        expect(mockRepository.save).toHaveBeenCalledWith(updatedUnit);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedUnit);
        expect(mockLogger.log).toHaveBeenCalledWith('Updated unit', { storeId, id: unitId, unitId: updatedUnit.id });
        expect(result).toEqual(updatedUnit);
      });
    });

    describe('delete', () => {
      it('should delete a unit and sync with cache and search', async () => {
        mockRepository.findOne.mockResolvedValue(mockUnit);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        });
        mockRepository.remove.mockResolvedValue(undefined);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.remove.mockResolvedValue(undefined);

        await service.delete(storeId, unitId);

        expect(mockRepository.remove).toHaveBeenCalledWith(mockUnit);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.remove).toHaveBeenCalledWith(storeId, unitId);
        expect(mockLogger.log).toHaveBeenCalledWith('Deleted unit', { storeId, id: unitId });
      });

      it('should throw error if unit has associations', async () => {
        mockRepository.findOne.mockResolvedValue(mockUnit);
        mockRepository.createQueryBuilder.mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(5), // Has 5 variants
        });

        await expect(service.delete(storeId, unitId)).rejects.toThrow('Unit has associations and cannot be deleted.');
      });
    });
  });

  describe('checkAssociations', () => {
    it('should return false for units without associations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      const result = await service.checkAssociations('store-123', '1');

      expect(result).toBe(false);
    });

    it('should return true for units with variants', async () => {
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
    const unitId = '1';
    const mockUnit = {
      id: 1,
      name: 'Test Unit',
      description: 'Test Description',
      storeId: storeId,
      isActive: true,
    } as any;

    describe('reindexStore', () => {
      it('should reindex units for a store', async () => {
        mockSearchService.reindexByStore.mockResolvedValue(undefined);

        await service.reindexStore(storeId);

        expect(mockSearchService.reindexByStore).toHaveBeenCalledWith(storeId);
        expect(mockLogger.log).toHaveBeenCalledWith(`Successfully reindexed units for store ${storeId}`);
      });

      it('should handle reindex errors', async () => {
        const error = new Error('Reindex failed');
        mockSearchService.reindexByStore.mockRejectedValue(error);

        await expect(service.reindexStore(storeId)).rejects.toThrow('Reindex failed');
        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to reindex units for store ${storeId}:`, error);
      });
    });

    describe('getActiveUnits', () => {
      it('should return active units for a store', async () => {
        const activeUnits = [mockUnit];
        mockRepository.find.mockResolvedValue(activeUnits);

        const result = await service.getActiveUnits(storeId);

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { storeId, isActive: true },
          order: { name: 'ASC' },
        });
        expect(result).toEqual(activeUnits);
      });
    });

    describe('toggleActive', () => {
      it('should toggle unit active status', async () => {
        const updatedUnit = { ...mockUnit, isActive: false };
        mockRepository.findOne.mockResolvedValue(mockUnit);
        mockRepository.save.mockResolvedValue(updatedUnit);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.update.mockResolvedValue(undefined);

        const result = await service.toggleActive(storeId, unitId);

        expect(mockRepository.save).toHaveBeenCalledWith({ ...mockUnit, isActive: false });
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.update).toHaveBeenCalledWith(updatedUnit);
        expect(mockLogger.log).toHaveBeenCalledWith('Toggled unit active status', { storeId, id: unitId, isActive: false });
        expect(result).toEqual(updatedUnit);
      });
    });

    describe('getUnitStatistics', () => {
      it('should return unit statistics', async () => {
        mockRepository.count
          .mockResolvedValueOnce(10) // totalUnits
          .mockResolvedValueOnce(7); // activeUnits

        const result = await service.getUnitStatistics(storeId);

        expect(mockRepository.count).toHaveBeenCalledWith({ where: { storeId } });
        expect(mockRepository.count).toHaveBeenCalledWith({ where: { storeId, isActive: true } });
        expect(result).toEqual({
          totalUnits: 10,
          activeUnits: 7,
          inactiveUnits: 3,
        });
      });
    });

    describe('searchUnits', () => {
      it('should search units by name or description', async () => {
        const searchResults = [mockUnit];
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(searchResults),
        };
        mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const result = await service.searchUnits(storeId, 'test');

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          '(unit.name ILIKE :search OR unit.description ILIKE :search)',
          { search: '%test%' }
        );
        expect(result).toEqual(searchResults);
      });
    });

    describe('getUnitByName', () => {
      it('should return unit by name', async () => {
        mockRepository.findOne.mockResolvedValue(mockUnit);

        const result = await service.getUnitByName(storeId, 'Test Unit');

        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { storeId, name: 'Test Unit' },
        });
        expect(result).toEqual(mockUnit);
      });

      it('should return null if unit not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        const result = await service.getUnitByName(storeId, 'Non-existent Unit');

        expect(result).toBeNull();
      });
    });

    describe('bulkCreate', () => {
      it('should bulk create units', async () => {
        const createDto: CreateUnitDto = {
          name: 'Test Unit',
          description: 'Test Description',
        };
        const units = [createDto, { name: 'Unit 2', description: 'Description 2' }];
        const createdUnits = units.map((unit, index) => ({ 
          id: index + 1, 
          name: unit.name, 
          description: unit.description, 
          storeId, 
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        // Mock repository.create to return objects with incremental IDs
        const mockCreatedUnits = units.map((unit, index) => ({
          ...unit,
          storeId,
          id: index + 1,
        }));
        
        let callIndex = 0;
        mockRepository.create.mockImplementation((data) => {
          return mockCreatedUnits[callIndex++];
        });
        mockRepository.save.mockResolvedValue(mockCreatedUnits);
        mockCacheService.invalidatePattern.mockResolvedValue(undefined);
        mockSearchService.index.mockResolvedValue(undefined);

        const result = await service.bulkCreate(storeId, units);

        expect(mockRepository.create).toHaveBeenCalledTimes(2);
        expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedUnits);
        expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(`store:${storeId}:*`);
        expect(mockSearchService.index).toHaveBeenCalledTimes(2);
        expect(mockLogger.log).toHaveBeenCalledWith('Bulk created units', { storeId, count: 2 });
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ name: 'Test Unit', description: 'Test Description', storeId });
        expect(result[1]).toMatchObject({ name: 'Unit 2', description: 'Description 2', storeId });
      });
    });
  });

  describe('query', () => {
    it('should build query with filters and sorts', async () => {
      const queryDto = {
        filters: [
          { column: 'name', operator: 'contains', value: 'test' },
          { column: 'isActive', operator: 'equals', value: true },
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

      await service.query('store-123', queryDto, 'store-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('unit.storeId = :storeId', { storeId: 'store-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
});
