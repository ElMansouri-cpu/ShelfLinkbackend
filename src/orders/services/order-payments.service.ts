import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderPayment } from '../entities/order-payment.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class OrderPaymentsService extends StoreCrudService<OrderPayment> {
  protected readonly alias = 'payment';
  protected readonly searchColumns = ['paymentMethod'] as (keyof OrderPayment)[];

  constructor(
    @InjectRepository(OrderPayment)
    protected readonly repo: Repository<OrderPayment>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 