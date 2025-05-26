import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createStoreDto: CreateStoreDto, userId: string): Promise<Store> {
    // Get user and check store limit
    const user = await this.userRepository.findOne({ where: { id: userId } });
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

  async findAll(userId: string): Promise<Store[]> {
    return this.storeRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { id, userId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto, userId: string): Promise<Store> {
    const store = await this.findOne(id, userId);
    
    // Update store
    Object.assign(store, updateStoreDto);
    
    return this.storeRepository.save(store);
  }

  async remove(id: string, userId: string): Promise<void> {
    const store = await this.findOne(id, userId);
    await this.storeRepository.remove(store);
  }

  async setPrimary(id: string, userId: string): Promise<Store> {
    // Get the store to make primary
    const store = await this.findOne(id, userId);
    
    // Get all user stores
    const userStores = await this.findAll(userId);
    
    // Update all stores to not be primary
    for (const userStore of userStores) {
      userStore.isPrimary = false;
      await this.storeRepository.save(userStore);
    }
    
    // Set the selected store as primary
    store.isPrimary = true;
    return this.storeRepository.save(store);
  }

  async getAllStores(): Promise<Store[]> {
    return this.storeRepository.find();
  }

  async updateLastActive(id: string, userId: string): Promise<Store> {
    const store = await this.findOne(id, userId);
    store.lastActive = new Date();
    return this.storeRepository.save(store);
  }
} 