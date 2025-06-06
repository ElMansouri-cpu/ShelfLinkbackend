import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Unit } from '../entities/unit.entity';
import { CacheEvict } from '../../cache/decorators';

@Injectable()
export class UnitSearchService extends BaseSearchService<Unit> {
  protected readonly index = 'units';
  protected readonly searchFields = [
    'name^3',
    'description^2'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {
    super(esService);
  }

  protected async flattenEntity(unit: Unit): Promise<any> {
    return {
      id: unit.id,
      name: unit.name,
      description: unit.description,
      storeId: unit.storeId,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:units:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    const units = await this.unitRepository.find({
      where: { storeId },
    });

    await this.bulkIndex(units);
  }
} 