import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../stores/entities/store.entity';
import { CreateStoreDto } from '../stores/dto/create-store.dto';
import { UpdateStoreDto } from '../stores/dto/update-store.dto';
import { User } from '../users/entities/user.entity';
import { Cacheable, CacheEvict, CachePatterns, EvictionPatterns } from '../cache/decorators';

/**
 * Example implementation of Phase 2 Caching Strategy
 * 
 * This service demonstrates comprehensive caching patterns including:
 * - Read-through caching with @Cacheable
 * - Write-through cache invalidation with @CacheEvict
 * - Pattern-based cache eviction
 * - Performance-optimized data access
 */
@Injectable()
export class CachedStoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create store with cache invalidation
   * Invalidates all user store caches when new store is created
   */
  @CacheEvict(EvictionPatterns.StoreAll((userId) => `user:${userId}:stores:*`))
  async create(createStoreDto: CreateStoreDto, userId: string): Promise<Store> {
    // Get user and check store limit
    const user = await this.getUserWithCaching(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count existing stores
    const storeCount = await this.storeRepository.count({ where: { userId } });
    if (storeCount >= user.storeLimit) {
      throw new BadRequestException(`You have reached your store limit of ${user.storeLimit}`);
    }

    // If this is the first store, make it primary
    if (storeCount === 0) {
      createStoreDto.isPrimary = true;
    }

    // Create new store
    const store = this.storeRepository.create({
      ...createStoreDto,
      userId,
      lastActive: new Date(),
    });

    return this.storeRepository.save(store);
  }

  /**
   * Get all user stores with caching (10 minutes TTL)
   * Key: user:{userId}:stores
   */
  @Cacheable(CachePatterns.User((userId) => `user:${userId}:stores`))
  async findAll(userId: string): Promise<Store[]> {
    return this.storeRepository.find({ 
      where: { userId },
      order: { isPrimary: 'DESC', lastActive: 'DESC' },
    });
  }

  /**
   * Get single store with caching (5 minutes TTL)
   * Key: store:{storeId}:user:{userId}
   */
  @Cacheable(CachePatterns.Store((storeId, userId) => `store:${storeId}:user:${userId}`))
  async findOne(id: string, userId: string): Promise<Store> {
    const store = await this.storeRepository.findOne({ 
      where: { id, userId },
      relations: ['owner'], // Load user relationship for better context
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  /**
   * Update store with selective cache eviction
   * Evicts both specific store cache and user's store list
   */
  @CacheEvict({
    patternGenerator: (id, updateStoreDto, userId) => `store:${id}:*`,
    keyGenerator: (id, updateStoreDto, userId) => `user:${userId}:stores`,
  })
  async update(id: string, updateStoreDto: UpdateStoreDto, userId: string): Promise<Store> {
    const store = await this.findOne(id, userId);
    
    // Update store with optimistic locking
    Object.assign(store, {
      ...updateStoreDto,
      updatedAt: new Date(),
    });
    
    return this.storeRepository.save(store);
  }

  /**
   * Delete store with comprehensive cache cleanup
   */
  @CacheEvict({
    patternGenerator: (id, userId) => `store:${id}:*`,
    keyGenerator: (id, userId) => `user:${userId}:stores`,
  })
  async remove(id: string, userId: string): Promise<void> {
    const store = await this.findOne(id, userId);
    await this.storeRepository.remove(store);
  }

  /**
   * Set primary store with full user cache invalidation
   * This operation affects multiple stores, so we clear all user caches
   */
  @CacheEvict({
    patternGenerator: (id, userId) => `user:${userId}:stores:*`,
  })
  async setPrimary(id: string, userId: string): Promise<Store> {
    // Get the store to make primary
    const store = await this.findOne(id, userId);
    
    // Get all user stores
    const userStores = await this.findAll(userId);
    
    // Use a transaction for consistency
    await this.storeRepository.manager.transaction(async (transactionalEntityManager) => {
      // Update all stores to not be primary
      for (const userStore of userStores) {
        userStore.isPrimary = false;
        await transactionalEntityManager.save(Store, userStore);
      }
      
      // Set the selected store as primary
      store.isPrimary = true;
      await transactionalEntityManager.save(Store, store);
    });
    
    return store;
  }

  /**
   * Get all stores (admin function) with long caching (1 hour)
   * Limited to 100 stores for performance
   */
  @Cacheable(CachePatterns.Static('all_stores'))
  async getAllStores(): Promise<Store[]> {
    return this.storeRepository.find({
      order: { createdAt: 'DESC' },
      take: 100, // Limit for performance
    });
  }

  /**
   * Update last active timestamp with cache eviction
   */
  @CacheEvict({
    keyGenerator: (id, userId) => `store:${id}:user:${userId}`,
  })
  async updateLastActive(id: string, userId: string): Promise<Store> {
    const store = await this.findOne(id, userId);
    store.lastActive = new Date();
    return this.storeRepository.save(store);
  }

  /**
   * Helper method with caching for user data
   * Key: user:{userId}:profile
   */
  @Cacheable(CachePatterns.User((userId) => `user:${userId}:profile`))
  private async getUserWithCaching(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  /**
   * Get store statistics with caching (30 minutes TTL)
   * Demonstrates complex data aggregation with caching
   */
  @Cacheable({
    ttl: 1800, // 30 minutes
    keyGenerator: (userId) => `user:${userId}:store_stats`,
  })
  async getStoreStatistics(userId: string): Promise<{
    totalStores: number;
    primaryStore: Store | null;
    lastActiveStore: Store | null;
    storeLimit: number;
    remainingSlots: number;
  }> {
    const [stores, user] = await Promise.all([
      this.findAll(userId),
      this.getUserWithCaching(userId),
    ]);

    const primaryStore = stores.find(store => store.isPrimary) || null;
    const lastActiveStore = stores.reduce((latest, store) => 
      !latest || store.lastActive > latest.lastActive ? store : latest
    , null as Store | null);

    return {
      totalStores: stores.length,
      primaryStore,
      lastActiveStore,
      storeLimit: user?.storeLimit || 0,
      remainingSlots: Math.max(0, (user?.storeLimit || 0) - stores.length),
    };
  }

  /**
   * Get frequently accessed stores with aggressive caching (2 minutes TTL)
   * For dashboard quick access
   */
  @Cacheable({
    ttl: 120, // 2 minutes
    keyGenerator: (userId) => `user:${userId}:recent_stores`,
  })
  async getRecentStores(userId: string, limit = 5): Promise<Store[]> {
    return this.storeRepository.find({
      where: { userId },
      order: { lastActive: 'DESC' },
      take: limit,
    });
  }

  /**
   * Search stores with search result caching
   * Demonstrates search result optimization
   */
  @Cacheable(CachePatterns.Search((userId, searchTerm) => `search:stores:${userId}:${searchTerm}`))
  async searchStores(userId: string, searchTerm: string): Promise<Store[]> {
    return this.storeRepository
      .createQueryBuilder('store')
      .where('store.userId = :userId', { userId })
      .andWhere('(store.name ILIKE :search OR store.description ILIKE :search)', {
        search: `%${searchTerm}%`,
      })
      .orderBy('store.lastActive', 'DESC')
      .limit(20) // Limit results for performance
      .getMany();
  }

  /**
   * Get store performance metrics with caching
   * Demonstrates analytics data caching
   */
  @Cacheable({
    ttl: 900, // 15 minutes
    keyGenerator: (storeId) => `store:${storeId}:performance`,
  })
  async getStorePerformance(storeId: string, userId: string): Promise<{
    orders: number;
    revenue: number;
    products: number;
    lastOrderDate: Date | null;
  }> {
    // This would typically involve complex queries across multiple tables
    // For now, we'll return mock data to demonstrate the caching pattern
    const store = await this.findOne(storeId, userId);
    
    return {
      orders: 0,
      revenue: 0,
      products: 0,
      lastOrderDate: store.lastActive,
    };
  }
} 