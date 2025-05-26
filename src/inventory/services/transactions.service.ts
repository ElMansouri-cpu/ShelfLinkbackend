import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class TransactionsService extends StoreCrudService<Transaction> {
  protected readonly alias = 'transaction';
  protected readonly searchColumns = ['reference'] as (keyof Transaction)[];

  constructor(
    @InjectRepository(Transaction)
    protected readonly repo: Repository<Transaction>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 