import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StoreCrudService } from 'src/common/services/store-crud.service';
import { Unit } from './entities/unit.entity';
import { Repository } from 'typeorm';
import { StoresService } from '../stores/stores.service';
import { UnitSearchService } from './services/unit-search.service';

@Injectable()
export class UnitsService extends StoreCrudService<Unit> {
  protected readonly alias = 'unit';
  protected readonly searchColumns: (keyof Unit)[] = ['name', 'description'];

  constructor(
    @InjectRepository(Unit) repo: Repository<Unit>,
    storesService: StoresService,
    private readonly unitSearchService: UnitSearchService,
  ) {
    super(repo, storesService);
  }

  /**
   * Override create with Elasticsearch indexing
   */
  async create(data: Partial<Unit>): Promise<Unit> {
    const unit = await super.create(data);
    
    // Index the new unit in Elasticsearch
    try {
      await this.unitSearchService.indexEntity(unit);
      console.log(`Indexed new unit ${unit.id} in Elasticsearch`);
    } catch (error) {
      console.error(`Failed to index new unit ${unit.id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return unit;
  }

  /**
   * Override update with Elasticsearch indexing
   */
  async update(id: string | number, data: Partial<Unit>): Promise<Unit> {
    const unit = await super.update(id, data);
    
    // Re-index the updated unit in Elasticsearch
    try {
      await this.unitSearchService.indexEntity(unit);
      console.log(`Re-indexed updated unit ${id} in Elasticsearch`);
    } catch (error) {
      console.error(`Failed to re-index updated unit ${id}:`, error);
      // Don't throw error to prevent transaction rollback
    }
    
    return unit;
  }

  /**
   * Override remove with Elasticsearch indexing
   */
  async remove(id: string | number): Promise<void> {
    await super.remove(id);
    
    // Remove the unit from Elasticsearch index
    try {
      await this.unitSearchService.removeEntity(id);
      console.log(`Removed unit ${id} from Elasticsearch index`);
    } catch (error) {
      console.error(`Failed to remove unit ${id} from Elasticsearch:`, error);
      // Don't throw error to prevent transaction rollback
    }
  }

  /**
   * Manually trigger reindexing for a specific store
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      await this.unitSearchService.reindexByStore(storeId);
      console.log(`Successfully reindexed units for store ${storeId}`);
    } catch (error) {
      console.error(`Failed to reindex units for store ${storeId}:`, error);
      throw error;
    }
  }
} 