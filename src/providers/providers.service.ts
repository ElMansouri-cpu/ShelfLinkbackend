import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { BaseEntityService } from '../common/services/base-entity.service';
import { CacheService } from '../cache/cache.service';
import { IEntityService } from '../common/interfaces/entity-service.interface';

@Injectable()
export class ProvidersService extends BaseEntityService<Provider, CreateProviderDto, UpdateProviderDto> implements IEntityService<Provider, CreateProviderDto, UpdateProviderDto> {
  constructor(
    @InjectRepository(Provider)
    protected readonly repository: Repository<Provider>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateProviderDto): Promise<Provider> {
    const { latitude, longitude, ...rest } = dto;

    // Handle location - if coordinates are provided, use them; otherwise use default
    let location = '(0,0)'; // Default location
    if (latitude !== undefined && longitude !== undefined) {
      location = `(${longitude},${latitude})`;
    }

    const provider = this.repository.create({
      ...rest,
      storeId,
      location,
    });

    const savedProvider = await this.repository.save(provider);
    await this.invalidateCache(storeId);
    this.logger.log('Created provider', { storeId, providerId: savedProvider.id });
    return savedProvider;
  }

  async findAll(storeId: string, query: any = {}): Promise<Provider[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<Provider[]>(cacheKey);
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

  async findOne(storeId: string, id: string): Promise<Provider> {
    const provider = await this.repository.findOne({ where: { id: parseInt(id), storeId } });
    if (!provider) {
      throw new NotFoundException(`Provider #${id} not found`);
    }
    return provider;
  }

  async update(storeId: string, id: string, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.findOne(storeId, id);

    // Handle location update if coordinates are provided
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      dto.location = `(${dto.longitude},${dto.latitude})`;
    }

    Object.assign(provider, dto);
    const updatedProvider = await this.repository.save(provider);
    await this.invalidateCache(storeId);
    this.logger.log('Updated provider', { storeId, id, providerId: updatedProvider.id });
    return updatedProvider;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new BadRequestException('Provider has associations and cannot be deleted.');
    }
    const provider = await this.findOne(storeId, id);
    await this.repository.remove(provider);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted provider', { storeId, id });
  }

  async query(storeId: string, queryDto: any, userId: string): Promise<Provider[]> {
    const qb = this.repository.createQueryBuilder('provider');
    qb.where('provider.storeId = :storeId', { storeId });

    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `provider.${filter.column}`;
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
        qb.addOrderBy(`provider.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the provider is referenced in other tables (e.g., variants, orders)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this provider is referenced in any variants
    const variantCount = await this.repository
      .createQueryBuilder('provider')
      .leftJoin('provider.variants', 'variants')
      .where('provider.id = :id', { id })
      .andWhere('provider.storeId = :storeId', { storeId })
      .getCount();

    // Check if this provider is referenced in any orders
    const orderCount = await this.repository
      .createQueryBuilder('provider')
      .leftJoin('provider.orders', 'orders')
      .where('provider.id = :id', { id })
      .andWhere('provider.storeId = :storeId', { storeId })
      .getCount();

    return variantCount > 0 || orderCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  async textSearchProviders(storeId: string, search: string): Promise<Provider[]> {
    return this.repository
      .createQueryBuilder('provider')
      .where('provider.storeId = :storeId', { storeId })
      .andWhere('(provider.name ILIKE :search OR provider.email ILIKE :search OR provider.phoneNumber ILIKE :search)', {
        search: `%${search}%`
      })
      .orderBy('provider.name', 'ASC')
      .getMany();
  }

  async findNearbyProviders(
    storeId: string,
    latitude: number,
    longitude: number,
    radiusInKm: number,
  ): Promise<Provider[]> {
    // Using PostGIS ST_DWithin for geographic distance calculation
    return this.repository
      .createQueryBuilder('provider')
      .where('provider.storeId = :storeId', { storeId })
      .andWhere(
        'ST_DWithin(provider.location::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)',
        { longitude, latitude, radius: radiusInKm * 1000 } // Convert km to meters
      )
      .orderBy('ST_Distance(provider.location::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography)')
      .getMany();
  }

  async getProviderStatistics(storeId: string): Promise<{
    totalProviders: number;
    activeProviders: number;
    averageRating: number;
    topRatedProvider: Provider | null;
  }> {
    const totalProviders = await this.repository.count({ where: { storeId } });
    const activeProviders = totalProviders; // All providers are considered active

    const topRatedProvider = await this.repository.findOne({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });

    // Since there's no rating field, return default values
    return {
      totalProviders,
      activeProviders,
      averageRating: 0,
      topRatedProvider,
    };
  }

  async getProvidersByStatus(storeId: string, status: 'active' | 'inactive'): Promise<Provider[]> {
    // Since there's no status field, return all providers for 'active', empty for 'inactive'
    if (status === 'active') {
      return this.repository.find({
        where: { storeId },
        order: { name: 'ASC' },
      });
    }
    return [];
  }

  async getTopRatedProviders(storeId: string, limit: number = 10): Promise<Provider[]> {
    // Since there's no rating field, return recent providers
    return this.repository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async updateProviderRating(providerId: number, storeId: string, newRating: number): Promise<Provider> {
    // Since there's no rating field, just return the provider
    const provider = await this.repository.findOne({ where: { id: providerId, storeId } });
    if (!provider) {
      throw new NotFoundException(`Provider #${providerId} not found`);
    }
    return provider;
  }
} 