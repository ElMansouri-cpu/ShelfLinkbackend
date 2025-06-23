import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Tax } from '../entities/tax.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';
import { VariantSearchService } from './variant-search.service';
import { TaxSearchService } from './tax-search.service';

@Injectable()
export class VariantTaxesService extends StoreCrudService<Tax> {
  protected readonly alias = 'tax';
  protected readonly searchColumns = ['name'] as (keyof Tax)[];

  constructor(
    @InjectRepository(Tax)
    protected readonly repo: Repository<Tax>,
    protected readonly storesService: StoresService,
    private readonly variantSearchService: VariantSearchService,
    private readonly taxSearchService: TaxSearchService,
  ) {
    super(repo, storesService);
  }

  async create(data: Partial<Tax>): Promise<Tax> {
    const tax = await super.create(data);
    
    // Index the new tax in Elasticsearch
    try {
      await this.taxSearchService.indexEntity(tax);
      console.log(`Indexed new tax ${tax.id} in Elasticsearch`);
    } catch (error) {
      console.error(`Failed to index new tax ${tax.id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return tax;
  }

  async findAll(where?: FindOptionsWhere<Tax>): Promise<Tax[]> {
    return super.findAll(where);
  }

  async findOne(id: string | number, whereExtra?: FindOptionsWhere<Tax>): Promise<Tax> {
    return super.findOne(id, whereExtra);
  }

  async update(id: string | number, data: Partial<Tax>, whereExtra?: FindOptionsWhere<Tax>): Promise<Tax> {
    const updatedTax = await super.update(id, data, whereExtra);
    
    // Re-index the updated tax in Elasticsearch
    try {
      await this.taxSearchService.indexEntity(updatedTax);
      console.log(`Re-indexed updated tax ${id} in Elasticsearch`);
    } catch (error) {
      console.error(`Failed to re-index updated tax ${id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    // Reindex all variants that use this tax
    await this.variantSearchService.reindexVariantsByTax(id.toString());
    
    return updatedTax;
  }

  async remove(id: string | number, whereExtra?: FindOptionsWhere<Tax>): Promise<void> {
    await super.remove(id, whereExtra);
    
    // Remove the tax from Elasticsearch index
    try {
      await this.taxSearchService.removeEntity(id);
      console.log(`Removed tax ${id} from Elasticsearch index`);
    } catch (error) {
      console.error(`Failed to remove tax ${id} from Elasticsearch:`, error);
      // Don't throw error to prevent transaction rollback
    }
  }

  /**
   * Manually trigger reindexing for a specific store
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      await this.taxSearchService.reindexByStore(storeId);
      console.log(`Successfully reindexed taxes for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex taxes for store ${storeId}:`, error);
      throw error;
    }
  }
} 