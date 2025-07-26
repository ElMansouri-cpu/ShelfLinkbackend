import { Injectable, Logger, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { User } from '../users/entities/user.entity';
import { BaseEntityService } from '../common/services/base-entity.service';
import { StoreSearchService } from './services/store-search.service';
import { CacheService } from '../cache/cache.service';
import { IEntityService } from '../common/interfaces/entity-service.interface';

@Injectable()
export class StoresService extends BaseEntityService<Store, CreateStoreDto, UpdateStoreDto> implements IEntityService<Store, CreateStoreDto, UpdateStoreDto> {
  constructor(
    @InjectRepository(Store)
    protected readonly repository: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
    @Optional() private readonly storeSearchService?: StoreSearchService,
  ) {
    super(repository, cacheService, storeSearchService, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(userId: string, dto: CreateStoreDto): Promise<Store> {
    // Get user and check store limit
    const user = await this.getUserWithCaching(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count existing stores
    const storeCount = await this.repository.count({ where: { userId } });
    if (storeCount >= user.storeLimit) {
      throw new BadRequestException(`You have reached your store limit of ${user.storeLimit}`);
    }

    // If this is the first store, make it primary
    if (storeCount === 0) {
      dto.isPrimary = true;
    }

    // Create new store
    const store = this.repository.create({
      ...dto,
      userId,
      lastActive: new Date(),
    });

    const savedStore = await this.repository.save(store);
    await this.invalidateCache(userId);
    if (this.storeSearchService) {
      await this.storeSearchService.index(savedStore);
    }
    this.logger.log('Created store', { userId, storeId: savedStore.id });
    return savedStore;
  }

  async findAll(userId: string, query: any = {}): Promise<Store[]> {
    const cacheKey = this.getCacheKey(userId, query);
    let results = await this.cacheService.get<Store[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { userId },
        order: { isPrimary: 'DESC', lastActive: 'DESC' },
        ...query,
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(userId: string, id: string): Promise<Store> {
    const store = await this.repository.findOne({ where: { id, userId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  async update(userId: string, id: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(userId, id);
    Object.assign(store, dto);
    const updatedStore = await this.repository.save(store);
    await this.invalidateCache(userId);
    if (this.storeSearchService) {
      await this.storeSearchService.update(updatedStore);
    }
    this.logger.log('Updated store', { userId, id, storeId: updatedStore.id });
    return updatedStore;
  }

  async delete(userId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(userId, id);
    if (hasAssociations) {
      throw new BadRequestException('Store has associations and cannot be deleted.');
    }
    const store = await this.findOne(userId, id);
    await this.repository.remove(store);
    await this.invalidateCache(userId);
    if (this.storeSearchService) {
      await this.storeSearchService.remove(userId, id);
    }
    this.logger.log('Deleted store', { userId, id });
  }

  async query(userId: string, queryDto: any, userIdParam: string): Promise<Store[]> {
    const qb = this.repository.createQueryBuilder('store');
    qb.where('store.userId = :userId', { userId });

    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `store.${filter.column}`;
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
        qb.addOrderBy(`store.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the store is referenced in other tables (e.g., categories, brands, variants)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(userId: string, id: string): Promise<boolean> {
    // Check if this store has categories
    const categoryCount = await this.repository
      .createQueryBuilder('store')
      .leftJoin('store.categories', 'categories')
      .where('store.id = :id', { id })
      .andWhere('store.userId = :userId', { userId })
      .getCount();

    // Check if this store has brands
    const brandCount = await this.repository
      .createQueryBuilder('store')
      .leftJoin('store.brands', 'brands')
      .where('store.id = :id', { id })
      .andWhere('store.userId = :userId', { userId })
      .getCount();

    // Check if this store has variants
    const variantCount = await this.repository
      .createQueryBuilder('store')
      .leftJoin('store.variants', 'variants')
      .where('store.id = :id', { id })
      .andWhere('store.userId = :userId', { userId })
      .getCount();
    
    return categoryCount > 0 || brandCount > 0 || variantCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  async setPrimary(id: string, userId: string): Promise<Store> {
    // First, unset all other stores as primary
    await this.repository.update(
      { userId, isPrimary: true },
      { isPrimary: false }
    );

    // Then set the specified store as primary
    const store = await this.findOne(userId, id);
    store.isPrimary = true;
    const updatedStore = await this.repository.save(store);
    
    await this.invalidateCache(userId);
    if (this.storeSearchService) {
      await this.storeSearchService.update(updatedStore);
    }
    
    return updatedStore;
  }

  async updateLastActive(id: string, userId: string): Promise<Store> {
    const store = await this.findOne(userId, id);
    store.lastActive = new Date();
    return this.repository.save(store);
  }

  private async getUserWithCaching(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async getStoreStatistics(userId: string): Promise<{
    totalStores: number;
    primaryStore: Store | null;
    lastActiveStore: Store | null;
    storeLimit: number;
    remainingSlots: number;
  }> {
    const user = await this.getUserWithCaching(userId);
    const totalStores = await this.repository.count({ where: { userId } });
    const primaryStore = await this.repository.findOne({ 
      where: { userId, isPrimary: true } 
    });
    const lastActiveStore = await this.repository.findOne({ 
      where: { userId },
      order: { lastActive: 'DESC' }
    });

    return {
      totalStores,
      primaryStore,
      lastActiveStore,
      storeLimit: user?.storeLimit || 0,
      remainingSlots: (user?.storeLimit || 0) - totalStores,
    };
  }

  async getRecentStores(userId: string, limit = 5): Promise<Store[]> {
    return this.repository.find({
      where: { userId },
      order: { lastActive: 'DESC' },
      take: limit,
    });
  }

  async searchStores(userId: string, searchTerm: string): Promise<Store[]> {
    if (!this.storeSearchService) {
      this.logger.warn('StoreSearchService is not available, using database search.');
      return this.repository
        .createQueryBuilder('store')
        .where('store.userId = :userId', { userId })
        .andWhere('(store.name ILIKE :search OR store.description ILIKE :search OR store.url ILIKE :search)', { 
          search: `%${searchTerm}%` 
        })
        .orderBy('store.isPrimary', 'DESC')
        .addOrderBy('store.lastActive', 'DESC')
        .getMany();
    }
    
    try {
      const searchResult = await this.storeSearchService.search(userId, { q: searchTerm });
      return searchResult.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.warn('Elasticsearch search failed, falling back to database search:', error);
      return this.repository
        .createQueryBuilder('store')
        .where('store.userId = :userId', { userId })
        .andWhere('(store.name ILIKE :search OR store.description ILIKE :search OR store.url ILIKE :search)', { 
          search: `%${searchTerm}%` 
        })
        .orderBy('store.isPrimary', 'DESC')
        .addOrderBy('store.lastActive', 'DESC')
        .getMany();
    }
  }

  async getStorePerformance(storeId: string, userId: string): Promise<{
    orders: number;
    revenue: number;
    products: number;
    lastOrderDate: Date | null;
  }> {
    const store = await this.findOne(userId, storeId);
    
    // This would typically involve more complex queries to get actual performance data
    // For now, returning basic store metrics
    return {
      orders: store.ordersCount,
      revenue: 0, // Would need to calculate from orders
      products: store.productsCount,
      lastOrderDate: store.lastActive,
    };
  }

  async getAllStores(): Promise<Store[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }
} 