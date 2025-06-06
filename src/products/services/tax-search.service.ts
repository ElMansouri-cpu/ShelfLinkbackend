import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Tax } from '../entities/tax.entity';
import { CacheEvict } from '../../cache/decorators';

@Injectable()
export class TaxSearchService extends BaseSearchService<Tax> {
  protected readonly index = 'taxes';
  protected readonly searchFields = [
    'name^3'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {
    super(esService);
  }

  protected async flattenEntity(tax: Tax): Promise<any> {
    return {
      id: tax.id,
      name: tax.name,
      rate: tax.rate,
      storeId: tax.storeId,
      isActive: tax.isActive,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    };
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:taxes:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    const taxes = await this.taxRepository.find({
      where: { storeId },
    });

    await this.bulkIndex(taxes);
  }
} 