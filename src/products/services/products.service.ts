import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';

@Injectable()
export class ProductsService extends StoreCrudService<Product> {
  protected readonly alias = 'product';
  protected readonly searchColumns = ['name', 'sku'] as unknown as (keyof Product)[];

  constructor(
    @InjectRepository(Product)
    protected readonly repo: Repository<Product>,
    protected readonly storesService: StoresService,
  ) {
    super(repo, storesService);
  }

  async search(storeId: string, search: string, userId: string): Promise<Product[]> {
    // Verify store access
    await this.storesService.findOne(storeId, userId);

    const qb = this.repo.createQueryBuilder(this.alias)
      .leftJoinAndSelect(`${this.alias}.brand`, 'brand')
      .leftJoinAndSelect(`${this.alias}.category`, 'category')
      .where(`${this.alias}.storeId = :storeId`, { storeId });

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      const or = [
        ...this.searchColumns.map(col => `${this.alias}.${String(col)} ILIKE :term`),
        'brand.name ILIKE :term',
        'category.name ILIKE :term'
      ].join(' OR ');
      qb.andWhere(`(${or})`, { term });
    }

    return qb.getMany();
  }
} 