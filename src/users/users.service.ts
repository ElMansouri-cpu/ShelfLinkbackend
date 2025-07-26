import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { BaseEntityService } from '../common/services/base-entity.service';
import { CacheService } from '../cache/cache.service';
import { IEntityService } from '../common/interfaces/entity-service.interface';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole } from './enums/role.enum';

@Injectable()
export class UsersService extends BaseEntityService<User, any, UpdateUserDto> implements IEntityService<User, any, UpdateUserDto> {
  constructor(
    @InjectRepository(User)
    protected readonly repository: Repository<User>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: any): Promise<User> {
    // Users are typically created through Supabase auth, not directly
    throw new Error('Users should be created through Supabase authentication');
  }

  async findAll(storeId: string, query: any = {}): Promise<User[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<User[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        order: { createdAt: 'DESC' },
        ...query,
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<User> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(storeId: string, id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(storeId, id);
    Object.assign(user, dto);
    const updatedUser = await this.repository.save(user);
    await this.invalidateCache(storeId);
    this.logger.log('Updated user', { storeId, id, userId: updatedUser.id });
    return updatedUser;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new Error('User has associations and cannot be deleted.');
    }
    const user = await this.findOne(storeId, id);
    await this.repository.remove(user);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted user', { storeId, id });
  }

  async query(storeId: string, queryDto: any, storeIdParam: string): Promise<User[]> {
    const qb = this.repository.createQueryBuilder('user');
    
    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `user.${filter.column}`;
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
        qb.addOrderBy(`user.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the user is referenced in other tables (e.g., stores)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this user has associated stores
    const storeCount = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user.stores', 'stores')
      .where('user.id = :id', { id })
      .getCount();
    
    return storeCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  /**
   * Find user by ID with caching
   */
  async findById(id: string): Promise<User> {
    const cacheKey = `user:${id}:profile`;
    let user = await this.cacheService.get<User>(cacheKey);
    if (!user) {
      const dbUser = await this.repository.findOne({ where: { id } });
      if (!dbUser) {
        throw new NotFoundException('User not found');
      }
      user = dbUser;
      await this.cacheService.set(cacheKey, user);
    }
    return user;
  }

  /**
   * Find user by email with caching
   */
  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email}`;
    let user = await this.cacheService.get<User>(cacheKey);
    if (!user) {
      const dbUser = await this.repository.findOne({ where: { email } });
      if (dbUser) {
        user = dbUser;
        await this.cacheService.set(cacheKey, user);
      }
    }
    return user || null;
  }

  /**
   * Get user with stores relation - cached separately
   */
  async findByIdWithStores(id: string): Promise<User> {
    const cacheKey = `user:${id}:with_stores`;
    let user = await this.cacheService.get<User>(cacheKey);
    if (!user) {
      const dbUser = await this.repository.findOne({ 
        where: { id },
        relations: ['stores']
      });
      if (!dbUser) {
        throw new NotFoundException('User not found');
      }
      user = dbUser;
      await this.cacheService.set(cacheKey, user);
    }
    return user;
  }

  /**
   * Sync user from Supabase with cache invalidation
   */
  async syncUserFromSupabase(supabaseUser: any): Promise<User> {
    // Check if user exists in our database
    let user = await this.repository.findOne({ where: { id: supabaseUser.id } });
    
    if (!user) {
      // Create new user if not exists
      user = this.repository.create({
        id: supabaseUser.id,
        email: supabaseUser.email,
        phone: supabaseUser.phone,
        username: supabaseUser.user_metadata?.username,
        user_metadata: supabaseUser.user_metadata,
        app_metadata: supabaseUser.app_metadata,
        storeLimit: 2, // Default limit for basic users
        subscriptionTier: 'basic', // Default tier
      });
    } else {
      // Update existing user with latest Supabase data
      user.email = supabaseUser.email;
      user.phone = supabaseUser.phone;
      user.username = supabaseUser.user_metadata?.username || user.username;
      user.user_metadata = supabaseUser.user_metadata;
      user.app_metadata = supabaseUser.app_metadata;
    }
    
    const savedUser = await this.repository.save(user);
    await this.cacheService.invalidatePattern(`user:${savedUser.id}:*`);
    this.logger.log('Synced user from Supabase', { userId: savedUser.id });
    return savedUser;
  }

  /**
   * Update user metadata with cache invalidation
   */
  async updateUserMetadata(id: string, metadata: Record<string, any>): Promise<User> {
    const user = await this.findById(id);
    user.user_metadata = { ...user.user_metadata, ...metadata };
    const updatedUser = await this.repository.save(user);
    await this.cacheService.invalidatePattern(`user:${id}:*`);
    this.logger.log('Updated user metadata', { userId: id });
    return updatedUser;
  }

  /**
   * Update store limit
   */
  async updateStoreLimit(id: string, limit: number): Promise<User> {
    const user = await this.findById(id);
    user.storeLimit = limit;
    const updatedUser = await this.repository.save(user);
    await this.cacheService.invalidatePattern(`user:${id}:*`);
    this.logger.log('Updated user store limit', { userId: id, limit });
    return updatedUser;
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(id: string, tier: string): Promise<User> {
    const user = await this.findById(id);
    user.subscriptionTier = tier;
    const updatedUser = await this.repository.save(user);
    await this.cacheService.invalidatePattern(`user:${id}:*`);
    this.logger.log('Updated user subscription tier', { userId: id, tier });
    return updatedUser;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(id: string): Promise<{
    totalStores: number;
    totalOrders: number;
    subscriptionTier: string;
    accountAge: number;
    lastLoginDate: Date | null;
  }> {
    const user = await this.findByIdWithStores(id);
    const totalStores = user.stores?.length || 0;
    
    // Calculate account age in days
    const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get last login date from metadata
    const lastLoginDate = user.user_metadata?.last_login ? new Date(user.user_metadata.last_login) : null;
    
    // This would typically involve more complex queries to get actual order data
    const totalOrders = 0; // Would need to calculate from orders table
    
    return {
      totalStores,
      totalOrders,
      subscriptionTier: user.subscriptionTier,
      accountAge,
      lastLoginDate,
    };
  }

  /**
   * Get users by subscription tier
   */
  async getUsersBySubscriptionTier(tier: string): Promise<User[]> {
    return this.repository.find({
      where: { subscriptionTier: tier },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Search users by username, email, or phone
   */
  async searchUsers(searchTerm: string, limit = 20): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where('(user.username ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)', { 
        search: `%${searchTerm}%` 
      })
      .orderBy('user.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.repository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get recent users
   */
  async getRecentUsers(limit = 10): Promise<User[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Reindex user in Elasticsearch
   */
  async reindexUser(userId: string): Promise<void> {
    try {
      // Removed userSearchService.reindexByUser(userId);
      this.logger.log(`Successfully reindexed user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to reindex user ${userId}:`, error);
      throw error;
    }
  }
}
