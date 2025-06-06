import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SupabaseService } from '../supabase/supabase.service';
import { Cacheable, CacheEvict, CachePatterns, EvictionPatterns } from '../cache/decorators';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Find user by ID with caching (10 minutes TTL)
   * Most frequently accessed method - aggressive caching
   */
  @Cacheable(CachePatterns.User((id) => `user:${id}:profile`))
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Find user by email with caching
   * Used for authentication - needs fresh data but can be cached briefly
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (email) => `user:email:${email}`,
  })
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Get user with stores relation - cached separately
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (id) => `user:${id}:with_stores`,
  })
  async findByIdWithStores(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['stores']
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Sync user from Supabase with cache invalidation
   * Invalidates user profile cache when user data changes
   */
  @CacheEvict({
    patternGenerator: (supabaseUser) => `user:${supabaseUser.id}:*`,
  })
  async syncUserFromSupabase(supabaseUser: any): Promise<User> {
    // Check if user exists in our database
    let user = await this.userRepository.findOne({ where: { id: supabaseUser.id } });
    
    if (!user) {
      // Create new user if not exists
      user = this.userRepository.create({
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
    
    return this.userRepository.save(user);
  }

  /**
   * Update user metadata with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `user:${id}:*`,
  })
  async updateUserMetadata(id: string, metadata: Record<string, any>): Promise<User> {
    const user = await this.findById(id);
    
    // Update user metadata
    user.user_metadata = {
      ...user.user_metadata,
      ...metadata
    };
    
    return this.userRepository.save(user);
  }

  /**
   * Update store limit with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `user:${id}:*`,
  })
  async updateStoreLimit(id: string, limit: number): Promise<User> {
    const user = await this.findById(id);
    user.storeLimit = limit;
    return this.userRepository.save(user);
  }

  /**
   * Update subscription tier with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `user:${id}:*`,
  })
  async updateSubscriptionTier(id: string, tier: string): Promise<User> {
    const user = await this.findById(id);
    user.subscriptionTier = tier;
    return this.userRepository.save(user);
  }

  /**
   * Get user statistics with aggressive caching (30 minutes)
   * Analytics data that doesn't change frequently
   */
  @Cacheable({
    ttl: 1800, // 30 minutes
    keyGenerator: (id) => `user:${id}:stats`,
  })
  async getUserStatistics(id: string): Promise<{
    totalStores: number;
    totalOrders: number;
    subscriptionTier: string;
    accountAge: number;
    lastLoginDate: Date | null;
  }> {
    const user = await this.findByIdWithStores(id);
    
    // Calculate user statistics
    const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)); // days
    
    return {
      totalStores: user.stores?.length || 0,
      totalOrders: 0, // Would be calculated from orders service
      subscriptionTier: user.subscriptionTier,
      accountAge,
      lastLoginDate: user.updatedAt || null, // Use updatedAt as proxy for last activity
    };
  }

  /**
   * Get users by subscription tier with caching
   * Admin function with longer cache
   */
  @Cacheable({
    ttl: 3600, // 1 hour
    keyGenerator: (tier) => `users:tier:${tier}`,
  })
  async getUsersBySubscriptionTier(tier: string): Promise<User[]> {
    return this.userRepository.find({
      where: { subscriptionTier: tier },
      order: { createdAt: 'DESC' },
      take: 100, // Limit for performance
    });
  }

  /**
   * Search users by username/email with search result caching
   */
  @Cacheable(CachePatterns.Search((searchTerm) => `search:users:${searchTerm}`))
  async searchUsers(searchTerm: string, limit = 20): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :search OR user.email ILIKE :search', {
        search: `%${searchTerm}%`,
      })
      .orderBy('user.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }
}
