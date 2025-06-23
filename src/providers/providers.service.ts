import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryDto } from 'src/common/dto/query.dto';
import { ProviderSearchService } from './services/provider-search.service';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private providersRepository: Repository<Provider>,
    private readonly providerSearchService: ProviderSearchService,
  ) {}

  async create(createProviderDto: CreateProviderDto, userId: string): Promise<Provider> {
    const location = `(${createProviderDto.longitude},${createProviderDto.latitude})`;
    const { latitude, longitude, ...rest } = createProviderDto;
    const provider = this.providersRepository.create({
      ...rest,
      location,
      userId,
    });
    
    const savedProvider = await this.providersRepository.save(provider);
    
    // Index the new provider in Elasticsearch
    try {
      await this.providerSearchService.indexEntity(savedProvider);
      console.log(`Indexed new provider ${savedProvider.id} in Elasticsearch`);
    } catch (error) {
      console.error(`Failed to index new provider ${savedProvider.id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return savedProvider;
  }

  async findAll(storeId: string, userId: string): Promise<Provider[]> {
    return this.providersRepository.find({
      where: { storeId, userId },
    });
  }

  async findOne(id: number, storeId: string, userId: string): Promise<Provider> {
    const provider = await this.providersRepository.findOne({
      where: { id, storeId, userId },
    });
    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }
    return provider;
  }

  async update(
    id: number,
    updateProviderDto: UpdateProviderDto,
    storeId: string,
    userId: string,
  ): Promise<Provider> {
    const { latitude, longitude, ...rest } = updateProviderDto;
    const updateData: any = { ...rest };

    if (latitude !== undefined && longitude !== undefined) {
      updateData.location = `(${longitude},${latitude})`;
    }

    await this.providersRepository.update(
      { id, storeId, userId },
      updateData,
    );
    
    const updatedProvider = await this.findOne(id, storeId, userId);
    
    // Re-index the updated provider in Elasticsearch
    try {
      await this.providerSearchService.indexEntity(updatedProvider);
      console.log(`Re-indexed updated provider ${id} in Elasticsearch`);
    } catch (error) {
      console.error(`Failed to re-index updated provider ${id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return updatedProvider;
  }

  async remove(id: number, storeId: string, userId: string): Promise<void> {
    await this.providersRepository.delete({ id, storeId, userId });
    
    // Remove the provider from Elasticsearch index
    try {
      await this.providerSearchService.removeEntity(id);
      console.log(`Removed provider ${id} from Elasticsearch index`);
    } catch (error) {
      console.error(`Failed to remove provider ${id} from Elasticsearch:`, error);
      // Don't throw error to prevent transaction rollback
    }
  }

  /**
   * Manually trigger reindexing for a specific store
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      await this.providerSearchService.reindexByStore(storeId);
      console.log(`Successfully reindexed providers for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex providers for store ${storeId}:`, error);
      throw error;
    }
  }

  async textSearchProviders(storeId: string, search: string, userId: string): Promise<Provider[]> {
    return this.providersRepository
      .createQueryBuilder('provider')
      .where('provider.storeId = :storeId', { storeId })
      .andWhere('provider.userId = :userId', { userId })
      .andWhere(
        '(provider.name ILIKE :search OR provider.email ILIKE :search OR provider.phoneNumber ILIKE :search)',
        { search: `%${search}%` },
      )
      .getMany();
  }

  async findNearbyProviders(
    storeId: string,
    latitude: number,
    longitude: number,
    radiusInKm: number,
    userId: string,
  ): Promise<Provider[]> {
    return this.providersRepository
      .createQueryBuilder('provider')
      .where('provider.storeId = :storeId', { storeId })
      .andWhere('provider.userId = :userId', { userId })
      .andWhere(
        `ST_DWithin(
          provider.location::geography,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radius
        )`,
        { longitude, latitude, radius: radiusInKm * 1000 }, // Convert km to meters
      )
      .getMany();
  }

  async queryProviders(queryDto: QueryDto): Promise<Provider[]> {
    const query = this.providersRepository.createQueryBuilder('provider');

    if (queryDto.filters && queryDto.filters.length > 0) {
      queryDto.filters.forEach(filter => {
        query.andWhere(`provider.${filter.column} = :${filter.column}`, { [filter.column]: filter.value });
      });
    }

    if (queryDto.sorts && queryDto.sorts.length > 0) {
      queryDto.sorts.forEach(sort => {
        query.addOrderBy(`provider.${sort.column}`, sort.direction);
      });
    }

    return query.getMany();
  }
} 