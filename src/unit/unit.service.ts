import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StoreCrudService } from 'src/common/services/store-crud.service';
import { Unit } from './entities/unit.entity';
import { Repository } from 'typeorm';
import { StoresService } from '../stores/stores.service';

@Injectable()
export class UnitsService extends StoreCrudService<Unit> {
  protected readonly alias = 'unit';
  protected readonly searchColumns: (keyof Unit)[] = ['name', 'description'];

  constructor(
    @InjectRepository(Unit) repo: Repository<Unit>,
    storesService: StoresService,
  ) {
    super(repo, storesService);
  }
} 