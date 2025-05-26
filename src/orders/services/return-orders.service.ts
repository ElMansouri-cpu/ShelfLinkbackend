import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnOrder } from '../entities/return-order.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class ReturnOrdersService extends StoreCrudService<ReturnOrder> {
  protected readonly alias = 'return';
  protected readonly searchColumns = ['returnNumber'] as (keyof ReturnOrder)[];

  constructor(
    @InjectRepository(ReturnOrder)
    protected readonly repo: Repository<ReturnOrder>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 