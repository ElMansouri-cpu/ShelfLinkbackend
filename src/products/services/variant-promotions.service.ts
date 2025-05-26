import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariantPromotion } from '../entities/variant-promotion.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class VariantPromotionsService extends StoreCrudService<VariantPromotion> {
  protected readonly alias = 'promotion';
  protected readonly searchColumns = ['name'] as unknown as (keyof VariantPromotion)[];

  constructor(
    @InjectRepository(VariantPromotion)
    protected readonly repo: Repository<VariantPromotion>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 