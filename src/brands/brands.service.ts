import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { StoresService } from '../stores/stores.service';
import { QueryDto } from 'src/common/dto/query.dto';
import { BrandSearchService } from './services/brand-search.service';
import { SearchableMixin, withSearch } from '../common/services/searchable-mixin.service';
import { SearchFilters, SearchResult } from '../common/services/base-search.service';
import { Cacheable, CacheEvict, CachePatterns } from '../cache/decorators';

@Injectable()
export class BrandsService implements SearchableMixin<Brand> {
  // Mixin properties and methods
  public readonly searchService: BrandSearchService;
  public readonly indexEntity: (entity: Brand) => Promise<void>;
  public readonly removeEntityFromIndex: (id: string | number) => Promise<void>;
  public readonly elasticSearch: (storeId: string, query: string, filters: SearchFilters, userId: string) => Promise<SearchResult<Brand>>;

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    public readonly storesService: StoresService,
    brandSearchService: BrandSearchService,
  ) {
    // Apply search mixin
    const searchMixin = withSearch<Brand>(brandSearchService);
    this.searchService = brandSearchService;
    this.indexEntity = searchMixin.indexEntity!;
    this.removeEntityFromIndex = searchMixin.removeEntityFromIndex!;
    this.elasticSearch = searchMixin.elasticSearch!;
  }

  /**
   * Create brand with cache invalidation
   * Invalidates store brand caches when new brand is created
   */
  @CacheEvict({
    patternGenerator: (createBrandDto, userId) => `store:${createBrandDto.storeId}:brands*`,
  })
  async create(createBrandDto: CreateBrandDto, userId: string): Promise<Brand> {
    // Verify that the store belongs to the user
    await this.storesService.findOne(createBrandDto.storeId, userId);

    // Create new brand
    const brand = this.brandRepository.create({
      ...createBrandDto,
      productsCount: 0,
    });

    const savedBrand = await this.brandRepository.save(brand);
    
    // Index in Elasticsearch
    await this.indexEntity(savedBrand);
    
    return savedBrand;
  }

  /**
   * Get all brands by store with caching (10 minutes TTL)
   * Brands don't change frequently, so longer cache
   */
  @Cacheable(CachePatterns.Store((storeId, userId) => `store:${storeId}:brands`))
  async findAll(storeId: string, userId: string): Promise<Brand[]> {
    // Verify that the store belongs to the user
    await this.storesService.findOne(storeId, userId);
    
    return this.brandRepository.find({
      where: { storeId },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Get single brand with caching (10 minutes TTL)
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (id, storeId, userId) => `brand:${id}:store:${storeId}`,
  })
  async findOne(id: number, storeId: string, userId: string): Promise<Brand> {
    // Verify that the store belongs to the user
    await this.storesService.findOne(storeId, userId);
    
    const brand = await this.brandRepository.findOne({
      where: { id, storeId },
    });
    
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    
    return brand;
  }

  /**
   * Update brand with cache invalidation
   * Invalidates specific brand cache and store brands list
   */
  @CacheEvict({
    patternGenerator: (id, updateBrandDto, storeId, userId) => `brand:${id}*`,
    keyGenerator: (id, updateBrandDto, storeId, userId) => `store:${storeId}:brands`,
  })
  async update(id: number, updateBrandDto: UpdateBrandDto, storeId: string, userId: string): Promise<Brand> {
    const brand = await this.findOne(id, storeId, userId);
    
    // If storeId is being updated, verify the new store belongs to the user
    if (updateBrandDto.storeId && updateBrandDto.storeId !== storeId) {
      await this.storesService.findOne(updateBrandDto.storeId, userId);
    }
    
    // Update brand
    Object.assign(brand, updateBrandDto);
    const updatedBrand = await this.brandRepository.save(brand);
    
    // Reindex in Elasticsearch
    await this.indexEntity(updatedBrand);
    
    return updatedBrand;
  }

  /**
   * Remove brand with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id, storeId, userId) => `brand:${id}*`,
    keyGenerator: (id, storeId, userId) => `store:${storeId}:brands`,
  })
  async remove(id: number, storeId: string, userId: string): Promise<void> {
    const brand = await this.findOne(id, storeId, userId);
    await this.brandRepository.remove(brand);
    
    // Remove from Elasticsearch
    await this.removeEntityFromIndex(id);
  }

  /**
   * Update products count with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id, storeId, userId, increment) => `brand:${id}*`,
    keyGenerator: (id, storeId, userId, increment) => `store:${storeId}:brands`,
  })
  async updateProductsCount(id: number, storeId: string, userId: string, increment: boolean = true): Promise<Brand> {
    const brand = await this.findOne(id, storeId, userId);
    
    if (increment) {
      brand.productsCount += 1;
    } else {
      brand.productsCount = Math.max(0, brand.productsCount - 1);
    }
    
    const updatedBrand = await this.brandRepository.save(brand);
    
    // Reindex in Elasticsearch
    await this.indexEntity(updatedBrand);
    
    return updatedBrand;
  }

  /**
   * Query brands with caching (5 minutes TTL)
   * Complex queries get shorter cache duration
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (storeId, dto, userId) => `store:${storeId}:brands:query:${JSON.stringify(dto)}`,
  })
  async queryBrands(storeId: string, dto: QueryDto, userId: string): Promise<Brand[]> {
    // Verify that the store belongs to the user
    await this.storesService.findOne(storeId, userId);

    const qb = this.brandRepository.createQueryBuilder('brand');
    qb.where('brand.storeId = :storeId', { storeId });

    // Filters
    dto.filters.forEach((filter, index) => {
      const paramKey = `filter_${index}`;
      const column = `brand.${filter.column}`;
      let condition = '';
      let value = filter.value;

      switch (filter.operator) {
        case 'contains':
          condition = `${column} ILIKE :${paramKey}`;
          value = `%${value}%`;
          break;
        case 'startsWith':
          condition = `${column} ILIKE :${paramKey}`;
          value = `${value}%`;
          break;
        case 'endsWith':
          condition = `${column} ILIKE :${paramKey}`;
          value = `%${value}`;
          break;
        case 'equals':
          condition = `${column} = :${paramKey}`;
          break;
      }

      qb.andWhere(condition, { [paramKey]: value });
    });

    // Sorting
    dto.sorts.forEach((sort) => {
      qb.addOrderBy(`brand.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
    });

    return qb.getMany();
  }

  /**
   * Text search brands with search result caching
   */
  @Cacheable(CachePatterns.Search((storeId, search, userId) => `search:brands:${storeId}:${search}`))
  async textSearchBrands(storeId: string, search: string, userId: string): Promise<Brand[]> {
    // First verify the store belongs to the user
    await this.storesService.findOne(storeId, userId);

    const query = this.brandRepository
      .createQueryBuilder('brand')
      .where('brand.storeId = :storeId', { storeId });
    if (search) {
      query.andWhere(
        `(brand.name ILIKE :search OR brand.description ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    return query.orderBy('brand.createdAt', 'DESC').limit(50).getMany();
  }

  /**
   * Get popular brands with caching (30 minutes TTL)
   * Analytics data that changes infrequently
   */
  @Cacheable({
    ttl: 1800, // 30 minutes
    keyGenerator: (storeId, userId, limit = 10) => `store:${storeId}:brands:popular:${limit}`,
  })
  async getPopularBrands(storeId: string, userId: string, limit: number = 10): Promise<Brand[]> {
    await this.storesService.findOne(storeId, userId);

    return this.brandRepository.find({
      where: { storeId },
      order: { productsCount: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get brand statistics with caching (15 minutes TTL)
   */
  @Cacheable({
    ttl: 900, // 15 minutes
    keyGenerator: (storeId, userId) => `store:${storeId}:brand_stats`,
  })
  async getBrandStatistics(storeId: string, userId: string): Promise<{
    totalBrands: number;
    brandsWithProducts: number;
    topBrandByProducts: Brand | null;
    averageProductsPerBrand: number;
  }> {
    await this.storesService.findOne(storeId, userId);

    const result = await this.brandRepository
      .createQueryBuilder('brand')
      .select([
        'COUNT(*) as totalBrands',
        'COUNT(CASE WHEN brand.productsCount > 0 THEN 1 END) as brandsWithProducts',
        'AVG(brand.productsCount) as averageProductsPerBrand',
      ])
      .where('brand.storeId = :storeId', { storeId })
      .getRawOne();

    const topBrand = await this.brandRepository.findOne({
      where: { storeId },
      order: { productsCount: 'DESC' },
    });

    return {
      totalBrands: parseInt(result.totalBrands) || 0,
      brandsWithProducts: parseInt(result.brandsWithProducts) || 0,
      topBrandByProducts: topBrand,
      averageProductsPerBrand: parseFloat(result.averageProductsPerBrand) || 0,
    };
  }

  /**
   * Get brands by name pattern with caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (storeId, pattern, userId) => `store:${storeId}:brands:pattern:${pattern}`,
  })
  async getBrandsByPattern(storeId: string, pattern: string, userId: string): Promise<Brand[]> {
    await this.storesService.findOne(storeId, userId);

    return this.brandRepository
      .createQueryBuilder('brand')
      .where('brand.storeId = :storeId', { storeId })
      .andWhere('brand.name ILIKE :pattern', { pattern: `%${pattern}%` })
      .orderBy('brand.name', 'ASC')
      .limit(20)
      .getMany();
  }
} 