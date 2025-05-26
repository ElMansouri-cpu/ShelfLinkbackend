import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreCrudService } from '../common/services/store-crud.service';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { StoresService } from '../stores/stores.service';

@Injectable()
export class InventoryService extends StoreCrudService<InventoryBatch> {
  protected readonly alias = 'batch';
  protected readonly searchColumns = ['batchNumber'] as (keyof InventoryBatch)[];

  constructor(
    @InjectRepository(InventoryBatch)
    protected readonly repo: Repository<InventoryBatch>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 