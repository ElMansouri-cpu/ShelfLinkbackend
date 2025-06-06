import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Tax } from '../entities/tax.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';
import { VariantSearchService } from './variant-search.service';

@Injectable()
export class VariantTaxesService extends StoreCrudService<Tax> {
  protected readonly alias = 'tax';
  protected readonly searchColumns = ['name'] as (keyof Tax)[];

  constructor(
    @InjectRepository(Tax)
    protected readonly repo: Repository<Tax>,
    protected readonly storesService: StoresService,
    private readonly variantSearchService: VariantSearchService,
  ) {
    super(repo, storesService);
  }

  async create(data: Partial<Tax>): Promise<Tax> {
    return super.create(data);
  }

  async findAll(where?: FindOptionsWhere<Tax>): Promise<Tax[]> {
    return super.findAll(where);
  }

  async findOne(id: string | number, whereExtra?: FindOptionsWhere<Tax>): Promise<Tax> {
    return super.findOne(id, whereExtra);
  }

  async update(id: string | number, data: Partial<Tax>, whereExtra?: FindOptionsWhere<Tax>): Promise<Tax> {
    const updatedTax = await super.update(id, data, whereExtra);
    
    // Reindex all variants that use this tax
    await this.variantSearchService.reindexVariantsByTax(id.toString());
    
    return updatedTax;
  }

  async remove(id: string | number, whereExtra?: FindOptionsWhere<Tax>): Promise<void> {
    return super.remove(id, whereExtra);
  }
} 