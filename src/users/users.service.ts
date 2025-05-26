import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

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

  async updateUserMetadata(id: string, metadata: Record<string, any>): Promise<User> {
    const user = await this.findById(id);
    
    // Update user metadata
    user.user_metadata = {
      ...user.user_metadata,
      ...metadata
    };
    
    return this.userRepository.save(user);
  }

  async updateStoreLimit(id: string, limit: number): Promise<User> {
    const user = await this.findById(id);
    user.storeLimit = limit;
    return this.userRepository.save(user);
  }

  async updateSubscriptionTier(id: string, tier: string): Promise<User> {
    const user = await this.findById(id);
    user.subscriptionTier = tier;
    return this.userRepository.save(user);
  }
}
