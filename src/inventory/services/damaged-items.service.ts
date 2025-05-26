import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DamagedItem } from '../entities/damaged-item.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class DamagedItemsService extends StoreCrudService<DamagedItem> {
  protected readonly alias = 'damaged';
  protected readonly searchColumns = ['reason'] as (keyof DamagedItem)[];

  constructor(
    @InjectRepository(DamagedItem)
    protected readonly repo: Repository<DamagedItem>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 