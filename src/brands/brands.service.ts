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

  async remove(id: number, storeId: string, userId: string): Promise<void> {
    const brand = await this.findOne(id, storeId, userId);
    await this.brandRepository.remove(brand);
    
    // Remove from Elasticsearch
    await this.removeEntityFromIndex(id);
  }

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

    return query.orderBy('brand.createdAt', 'DESC').getMany();
  }
} 