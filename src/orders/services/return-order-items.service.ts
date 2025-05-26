import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnOrderItem } from '../entities/return-order-item.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class ReturnOrderItemsService extends StoreCrudService<ReturnOrderItem> {
  protected readonly alias = 'returnItem';
  protected readonly searchColumns = ['quantity'] as unknown as (keyof ReturnOrderItem)[];

  constructor(
    @InjectRepository(ReturnOrderItem)
    protected readonly repo: Repository<ReturnOrderItem>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 