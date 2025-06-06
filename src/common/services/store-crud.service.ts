// src/common/services/store-crud.service.ts
import { Repository, ObjectLiteral, FindOptionsWhere } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseCrudService } from './base-crud.service';
import { StoresService } from 'src/stores/stores.service';
import { QueryDto } from 'src/common/dto/query.dto';

@Injectable()
export abstract class StoreCrudService<T extends ObjectLiteral> extends BaseCrudService<T> {
  /**
   * Sub‐classes *must* override these:
   */
  protected abstract readonly alias: string;

  constructor(
    protected readonly repo: Repository<T>,
    protected readonly storesService: StoresService,
  ) {
    super(repo);
  }

  private async verify(storeId: string, userId: string) {
    await this.storesService.findOne(storeId, userId);
  }

  // ——————————————————————————————————————————
  // override base‐CRUD to inject store/user checks
  // ——————————————————————————————————————————

  async create(data: Partial<T>): Promise<T> {
    const storeId = (data as any).storeId;
    const userId = (data as any).userId;
    await this.verify(storeId, userId);
    return super.create(data);
  }

  async findAll(where?: FindOptionsWhere<T>): Promise<T[]> {
    const storeId = (where as any).storeId;
    const userId = (where as any).userId;
    await this.verify(storeId, userId);
    return super.findAll(where);
  }

  async findOne(id: number | string, whereExtra: FindOptionsWhere<T> = {}): Promise<T> {
    const storeId = (whereExtra as any).storeId;
    const userId = (whereExtra as any).userId;
    await this.verify(storeId, userId);
    return super.findOne(id, whereExtra);
  }

  async update(
    id: number | string,
    data: Partial<T>,
    whereExtra: FindOptionsWhere<T> = {},
  ): Promise<T> {
    const storeId = (whereExtra as any).storeId;
    const userId = (whereExtra as any).userId;
    await this.verify(storeId, userId);
    return super.update(id, data, whereExtra);
  }

  async remove(id: number | string, whereExtra: FindOptionsWhere<T> = {}): Promise<void> {
    const storeId = (whereExtra as any).storeId;
    const userId = (whereExtra as any).userId;
    await this.verify(storeId, userId);
    return super.remove(id, whereExtra);
  }

  // ——————————————————————————————————————————
  // new: generic filter / sort via QueryDto
  // ——————————————————————————————————————————

  async query(storeId: string, dto: QueryDto, userId: string): Promise<T[]> {
    await this.verify(storeId, userId);

    const qb = this.repo.createQueryBuilder(this.alias)
      .where(`${this.alias}.storeId = :storeId`, { storeId });

    dto.filters.forEach((f, i) => {
      const key = `filter_${i}`;
      let cond: string, val: any = f.value;
      const col = `${this.alias}.${f.column}`;
      switch (f.operator) {
        case 'contains':
          cond = `${col} ILIKE :${key}`; val = `%${val}%`; break;
        case 'startsWith':
        case 'starts with':
          cond = `${col} ILIKE :${key}`; val = `${val}%`; break;
        case 'endsWith':
        case 'ends with':
          cond = `${col} ILIKE :${key}`; val = `%${val}`; break;
        case 'equals':
        case '=':
          cond = `${col} = :${key}`; break;
        case '!=':
        case 'notEquals':
          cond = `${col} <> :${key}`; break;
        default:
          cond = `${col} = :${key}`; break;
      }
      qb.andWhere(cond, { [key]: val });
    });

    dto.sorts.forEach(s =>
      qb.addOrderBy(`${this.alias}.${s.column}`, s.direction.toUpperCase() as 'ASC' | 'DESC')
    );

    return qb.getMany();
  }
}
