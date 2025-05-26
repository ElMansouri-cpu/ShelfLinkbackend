import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariantSpecialPrice } from '../entities/variant-special-price.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class VariantPricesService extends StoreCrudService<VariantSpecialPrice> {
  protected readonly alias = 'price';
  protected readonly searchColumns = ['price'] as unknown as (keyof VariantSpecialPrice)[];

  constructor(
    @InjectRepository(VariantSpecialPrice)
    protected readonly repo: Repository<VariantSpecialPrice>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 