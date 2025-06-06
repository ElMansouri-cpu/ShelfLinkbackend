import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { Variant } from '../entities/variant.entity';
import { StoresService } from '../../stores/stores.service';
import { VariantSearchService } from './variant-search.service';

@Injectable()
export class VariantService extends StoreCrudService<Variant> {
  protected alias = 'variant';
  protected searchColumns = ['name', 'sku', 'barcode'] as (keyof Variant)[];

  constructor(
    @InjectRepository(Variant)
    protected repository: Repository<Variant>,
    protected readonly storesService: StoresService,
    private readonly variantSearchService: VariantSearchService,
  ) {
    super(repository, storesService);
  }

  async create(data: Partial<Variant>): Promise<Variant> {
    const variant = await super.create(data);
    await this.variantSearchService.indexVariant(variant);
    return variant;
  }



  async findAll(where?: any): Promise<Variant[]> {
    return this.repository.find({
      where,
      relations: ['taxes']
    });
  }

  async findOne(id: string | number, whereExtra: any = {}): Promise<Variant> {
    const variant = await this.repository.findOne({
      where: { id, ...whereExtra } as any,
      relations: ['taxes']
    });

    if (!variant) {
      throw new NotFoundException(`Variant #${id} not found`);
    }

    return variant;
  }

  async remove(id: string | number, whereExtra: any = {}): Promise<void> {
    await super.remove(id, whereExtra);
    await this.variantSearchService.removeVariant(id.toString());
  }

  async update(
    id: string | number,
    data: Partial<Variant>,
    whereExtra: any = {},
  ): Promise<Variant> {
    // Handle taxes separately if they are included in the update
    const { taxes, ...updateData } = data as any;

    // First update the variant without taxes
    await this.repository.update({ id, ...whereExtra } as any, updateData);

    // If taxes are provided, update the many-to-many relationship
    if (taxes) {
      const variant = await this.repository.findOne({
        where: { id, ...whereExtra } as any,
        relations: ['taxes']
      });

      if (!variant) {
        throw new NotFoundException(`Variant #${id} not found`);
      }

      // Update the taxes relationship
      await this.repository
        .createQueryBuilder()
        .relation(Variant, 'taxes')
        .of(variant)
        .addAndRemove(taxes, variant.taxes.map(t => t.id));
    }

    // Return the updated variant with all relations
    const updatedVariant = await this.repository.findOne({
      where: { id, ...whereExtra } as any,
      relations: ['taxes']
    });

    if (!updatedVariant) {
      throw new NotFoundException(`Variant #${id} not found`);
    }

    await this.variantSearchService.indexVariant(updatedVariant);
    return updatedVariant;
  }
} 