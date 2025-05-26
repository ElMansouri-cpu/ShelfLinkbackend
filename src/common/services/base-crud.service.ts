// src/common/services/base-crud.service.ts
import { Repository, FindOptionsWhere, ObjectLiteral, DeepPartial } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseCrudService<T extends ObjectLiteral> {
  constructor(protected readonly repo: Repository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const entity = this.repo.create(data as DeepPartial<T>);
    return this.repo.save(entity) as Promise<T>;
  }

  async findAll(where?: FindOptionsWhere<T>): Promise<T[]> {
    return this.repo.find({ where });
  }

  async findOne(id: number | string, whereExtra: FindOptionsWhere<T> = {}): Promise<T> {
    const entity = await this.repo.findOne({ where: { id, ...whereExtra } as any });
    if (!entity) throw new NotFoundException(`${this.repo.metadata.name} #${id} not found`);
    return entity;
  }

  async update(
    id: number | string,
    data: Partial<T>,
    whereExtra: FindOptionsWhere<T> = {},
  ): Promise<T> {
    await this.repo.update({ id, ...whereExtra } as any, data as any);
    return this.findOne(id, whereExtra);
  }

  async remove(id: number | string, whereExtra: FindOptionsWhere<T> = {}): Promise<void> {
    await this.repo.delete({ id, ...whereExtra } as any);
  }
}
