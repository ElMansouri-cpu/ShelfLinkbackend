import { Test, TestingModule } from '@nestjs/testing';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from '../swagger/swagger-dtos';
import { QueryDto } from '../common/dto/query.dto';

describe('BrandsController', () => {
  let controller: BrandsController;

  const mockBrandsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    getPopularBrands: jest.fn(),
    getBrandStatistics: jest.fn(),
  };

  const storeId = 'store-123';
  const brandId = '1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [
        {
          provide: BrandsService,
          useValue: mockBrandsService,
        },
      ],
    }).compile();

    controller = module.get<BrandsController>(BrandsController);

    jest.clearAllMocks();
  });

  describe('CRUD Endpoints', () => {
    const createDto: CreateBrandDto = {
      name: 'Test Brand',
      description: 'Test Description',
      website: 'https://test.com',
    };

    const updateDto: UpdateBrandDto = {
      name: 'Updated Brand',
    };

    describe('POST /', () => {
      it('should create a brand', async () => {
        const expectedBrand = { id: 1, ...createDto, storeId };
        mockBrandsService.create.mockResolvedValue(expectedBrand);

        const result = await controller.create(storeId, createDto);

        expect(mockBrandsService.create).toHaveBeenCalledWith(
          storeId,
          createDto,
        );
        expect(result).toEqual(expectedBrand);
      });
    });

    describe('GET /', () => {
      it('should return all brands for store', async () => {
        const expectedBrands = [
          { id: 1, name: 'Brand 1', storeId },
          { id: 2, name: 'Brand 2', storeId },
        ];
        mockBrandsService.findAll.mockResolvedValue(expectedBrands);

        const result = await controller.findAll(storeId, { limit: 10 });

        expect(mockBrandsService.findAll).toHaveBeenCalledWith(storeId, {
          limit: 10,
        });
        expect(result).toEqual(expectedBrands);
      });
    });

    describe('GET /:id', () => {
      it('should return a specific brand', async () => {
        const expectedBrand = { id: 1, name: 'Test Brand', storeId };
        mockBrandsService.findOne.mockResolvedValue(expectedBrand);

        const result = await controller.findOne(storeId, brandId);

        expect(mockBrandsService.findOne).toHaveBeenCalledWith(
          storeId,
          brandId,
        );
        expect(result).toEqual(expectedBrand);
      });
    });

    describe('PUT /:id', () => {
      it('should update a brand', async () => {
        const expectedBrand = { id: 1, ...updateDto, storeId };
        mockBrandsService.update.mockResolvedValue(expectedBrand);

        const result = await controller.update(storeId, brandId, updateDto);

        expect(mockBrandsService.update).toHaveBeenCalledWith(
          storeId,
          brandId,
          updateDto,
        );
        expect(result).toEqual(expectedBrand);
      });
    });

    describe('DELETE /:id', () => {
      it('should delete a brand', async () => {
        mockBrandsService.delete.mockResolvedValue(undefined);

        const result = await controller.remove(storeId, brandId);

        expect(mockBrandsService.delete).toHaveBeenCalledWith(storeId, brandId);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('Entity-specific Endpoints', () => {
    describe('POST /query', () => {
      it('should query brands with filters and sorts', async () => {
        const queryDto: QueryDto = {
          filters: [{ column: 'name', operator: 'contains', value: 'test' }],
          sorts: [{ column: 'name', direction: 'ASC' }],
        };
        const expectedResults = [{ id: 1, name: 'Test Brand' }];
        mockBrandsService.query.mockResolvedValue(expectedResults);

        const result = await controller.queryBrands(storeId, queryDto);

        expect(mockBrandsService.query).toHaveBeenCalledWith(
          storeId,
          queryDto,
          storeId,
        );
        expect(result).toEqual(expectedResults);
      });
    });

    describe('GET /popular', () => {
      it('should return popular brands', async () => {
        const expectedBrands = [
          { id: 1, name: 'Popular Brand 1', productsCount: 10 },
          { id: 2, name: 'Popular Brand 2', productsCount: 8 },
        ];
        mockBrandsService.getPopularBrands.mockResolvedValue(expectedBrands);

        const result = await controller.getPopularBrands(storeId, 10);

        expect(mockBrandsService.getPopularBrands).toHaveBeenCalledWith(
          storeId,
          10,
        );
        expect(result).toEqual(expectedBrands);
      });
    });

    describe('GET /statistics', () => {
      it('should return brand statistics', async () => {
        const expectedStats = {
          totalBrands: 5,
          brandsWithProducts: 3,
          topBrandByProducts: { id: 1, name: 'Top Brand', productsCount: 10 },
          averageProductsPerBrand: 6.5,
        };
        mockBrandsService.getBrandStatistics.mockResolvedValue(expectedStats);

        const result = await controller.getBrandStatistics(storeId);

        expect(mockBrandsService.getBrandStatistics).toHaveBeenCalledWith(
          storeId,
        );
        expect(result).toEqual(expectedStats);
      });
    });
  });
});
