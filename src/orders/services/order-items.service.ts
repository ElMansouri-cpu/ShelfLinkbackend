import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../entities/order-item.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class OrderItemsService extends StoreCrudService<OrderItem> {
  protected readonly alias = 'item';
  protected readonly searchColumns = ['variantId'] as (keyof OrderItem)[];

  constructor(
    @InjectRepository(OrderItem)
    protected readonly repo: Repository<OrderItem>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 