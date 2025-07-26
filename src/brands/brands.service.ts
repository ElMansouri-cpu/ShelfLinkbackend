import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BaseEntityService } from '../common/services/base-entity.service';
import { CacheService } from '../cache/cache.service';
import { IEntityService } from '../common/interfaces/entity-service.interface';

@Injectable()
export class BrandsService extends BaseEntityService<Brand, CreateBrandDto, UpdateBrandDto> implements IEntityService<Brand, CreateBrandDto, UpdateBrandDto> {
  constructor(
    @InjectRepository(Brand)
    protected readonly repository: Repository<Brand>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateBrandDto): Promise<Brand> {
    const brand = this.repository.create({
      ...dto,
      storeId,
      productsCount: 0,
    });
    const savedBrand = await this.repository.save(brand);
    await this.invalidateCache(storeId);
    this.logger.log('Created brand', { storeId, brandId: savedBrand.id });
    return savedBrand;
  }

  async findAll(storeId: string, query: any = {}): Promise<Brand[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<Brand[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { storeId },
        order: { name: 'ASC' },
        ...query,
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<Brand> {
    const brand = await this.repository.findOne({ where: { id: parseInt(id), storeId } });
    if (!brand) {
      throw new NotFoundException(`Brand #${id} not found`);
    }
    return brand;
  }

  async update(storeId: string, id: string, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(storeId, id);
    Object.assign(brand, dto);
    const updatedBrand = await this.repository.save(brand);
    await this.invalidateCache(storeId);
    this.logger.log('Updated brand', { storeId, id, brandId: updatedBrand.id });
    return updatedBrand;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new BadRequestException('Brand has associations and cannot be deleted.');
    }
    const brand = await this.findOne(storeId, id);
    await this.repository.remove(brand);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted brand', { storeId, id });
  }

  async query(storeId: string, queryDto: any, userId: string): Promise<Brand[]> {
    const qb = this.repository.createQueryBuilder('brand');
    qb.where('brand.storeId = :storeId', { storeId });

    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
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
    }

    // Apply sorting
    if (queryDto.sorts) {
      queryDto.sorts.forEach((sort: any) => {
        qb.addOrderBy(`brand.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the brand is referenced in other tables (e.g., variants)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this brand is referenced in any variants
    const variantCount = await this.repository
      .createQueryBuilder('brand')
      .leftJoin('brand.variants', 'variants')
      .where('brand.id = :id', { id })
      .andWhere('brand.storeId = :storeId', { storeId })
      .getCount();
    
    return variantCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  async updateProductsCount(id: number, storeId: string, increment: boolean = true): Promise<Brand> {
    const brand = await this.repository.findOne({ where: { id, storeId } });
    if (!brand) {
      throw new NotFoundException(`Brand #${id} not found`);
    }

    brand.productsCount = increment ? brand.productsCount + 1 : Math.max(0, brand.productsCount - 1);
    return this.repository.save(brand);
  }

  async getPopularBrands(storeId: string, limit: number = 10): Promise<Brand[]> {
    return this.repository.find({
      where: { storeId },
      order: { productsCount: 'DESC' },
      take: limit,
    });
  }

  async getBrandStatistics(storeId: string): Promise<{
    totalBrands: number;
    brandsWithProducts: number;
    topBrandByProducts: Brand | null;
    averageProductsPerBrand: number;
  }> {
    const totalBrands = await this.repository.count({ where: { storeId } });
    const brandsWithProducts = await this.repository.count({ 
      where: { storeId, productsCount: 0 },
    });
    
    const topBrand = await this.repository.findOne({
      where: { storeId },
      order: { productsCount: 'DESC' },
    });

    const result = await this.repository
      .createQueryBuilder('brand')
      .select('AVG(brand.productsCount)', 'average')
      .where('brand.storeId = :storeId', { storeId })
      .getRawOne();

    return {
      totalBrands,
      brandsWithProducts: totalBrands - brandsWithProducts,
      topBrandByProducts: topBrand,
      averageProductsPerBrand: parseFloat(result.average) || 0,
    };
  }

  async getBrandDependencies(id: number, storeId: string): Promise<{
    hasVariants: boolean;
    variantCount: number;
    variants?: any[];
  }> {
    const brand = await this.repository.findOne({
      where: { id, storeId },
      relations: ['variants'],
    });

    if (!brand) {
      throw new NotFoundException(`Brand #${id} not found`);
    }

    return {
      hasVariants: brand.variants.length > 0,
      variantCount: brand.variants.length,
      variants: brand.variants,
    };
  }
} 