import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Brand } from '../entities/brand.entity';
import { CacheEvict } from '../../cache/decorators';

@Injectable()
export class BrandSearchService extends BaseSearchService<Brand> {
  protected readonly index = 'brands';
  protected readonly searchFields = [
    'name^3',
    'description^2',
    'website',
    'store.name^2'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {
    super(esService);
  }

  protected async flattenEntity(brand: Brand): Promise<any> {
    return {
      id: brand.id,
      name: brand.name,
      image: brand.image,
      website: brand.website,
      description: brand.description,
      status: brand.status,
      productsCount: brand.productsCount,
      storeId: brand.storeId,
      
      store: brand.store ? {
        id: brand.store.id,
        name: brand.store.name,
        logo: brand.store.logo,
        url: brand.store.url,
        status: brand.store.status,
      } : null,
      
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:brands:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    const brands = await this.brandRepository.find({
      where: { storeId },
      relations: ['store'],
    });

    await this.bulkIndex(brands);
  }
} 