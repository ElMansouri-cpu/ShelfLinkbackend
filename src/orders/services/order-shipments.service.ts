import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderShipment } from '../entities/order-shipment.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class OrderShipmentsService extends StoreCrudService<OrderShipment> {
  protected readonly alias = 'shipment';
  protected readonly searchColumns = ['trackingNumber'] as unknown as (keyof OrderShipment)[];

  constructor(
    @InjectRepository(OrderShipment)
    protected readonly repo: Repository<OrderShipment>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 