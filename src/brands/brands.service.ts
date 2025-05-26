import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { StoresService } from '../stores/stores.service';
import { QueryDto } from 'src/common/dto/query.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly storesService: StoresService,
  ) {}

  async create(createBrandDto: CreateBrandDto, userId: string): Promise<Brand> {
    // Verify that the store belongs to the user
    await this.storesService.findOne(createBrandDto.storeId, userId);

    // Create new brand
    const brand = this.brandRepository.create({
      ...createBrandDto,
      productsCount: 0,
    });

    return this.brandRepository.save(brand);
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
    
    return this.brandRepository.save(brand);
  }

  async remove(id: number, storeId: string, userId: string): Promise<void> {
    const brand = await this.findOne(id, storeId, userId);
    await this.brandRepository.remove(brand);
  }

  async updateProductsCount(id: number, storeId: string, userId: string, increment: boolean = true): Promise<Brand> {
    const brand = await this.findOne(id, storeId, userId);
    
    if (increment) {
      brand.productsCount += 1;
    } else {
      brand.productsCount = Math.max(0, brand.productsCount - 1);
    }
    
    return this.brandRepository.save(brand);
  }

  async queryBrands(dto: QueryDto) {
    const qb = this.brandRepository.createQueryBuilder('brand');

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

  async textSearchBrands(
    storeId: string,
    search: string,
    userId: string): Promise<Brand[]> {
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