import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreCrudService } from '../common/services/store-crud.service';
import { Invoice } from './entities/invoice.entity';
import { StoresService } from '../stores/stores.service';

@Injectable()
export class FinancialService extends StoreCrudService<Invoice> {
  protected readonly alias = 'invoice';
  protected readonly searchColumns = ['status', 'orderType'] as (keyof Invoice)[];

  constructor(
    @InjectRepository(Invoice)
    protected readonly repo: Repository<Invoice>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 