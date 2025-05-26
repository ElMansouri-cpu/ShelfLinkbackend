import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockTransfer } from '../entities/stock-transfer.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class StockTransfersService extends StoreCrudService<StockTransfer> {
  protected readonly alias = 'transfer';
  protected readonly searchColumns = ['transferNumber'] as unknown as (keyof StockTransfer)[];

  constructor(
    @InjectRepository(StockTransfer)
    protected readonly repo: Repository<StockTransfer>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 