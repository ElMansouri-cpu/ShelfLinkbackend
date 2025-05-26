import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreCrudService } from '../common/services/store-crud.service';
import { Variant } from './entities/variant.entity';
import { StoresService } from '../stores/stores.service';

@Injectable()
export class ProductsService extends StoreCrudService<Variant> {
  protected readonly alias = 'variant';
  protected readonly searchColumns = ['name', 'sku', 'barcode'] as (keyof Variant)[];

  constructor(
    @InjectRepository(Variant)
    protected readonly repo: Repository<Variant>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 