import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderReturn } from '../entities/order-return.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class OrderReturnsService extends StoreCrudService<OrderReturn> {
  protected readonly alias = 'return';
  protected readonly searchColumns = ['returnReason'] as unknown as (keyof OrderReturn)[];

  constructor(
    @InjectRepository(OrderReturn)
    protected readonly repo: Repository<OrderReturn>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 