// src/variants/variant-search.service.ts
import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from '../entities/variant.entity';

@Injectable()
export class VariantSearchService {
  private readonly index = 'variants';

  constructor(
    private readonly esService: ElasticsearchService,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>
  ) {}

  private async flattenVariant(variant: Variant) {
    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      description: variant.description,
      storeId: variant.storeId,

      store: variant.store ? {
        id: variant.store.id,
        name: variant.store.name,
        logo: variant.store.logo,
        banner: variant.store.banner,
        url: variant.store.url,
        description: variant.store.description,
        location: variant.store.location,
        isPrimary: variant.store.isPrimary,
        productsCount: variant.store.productsCount,
        ordersCount: variant.store.ordersCount
      } : null,

      image: variant.image,

      brand: variant.brand ? {
        id: variant.brand.id,
        name: variant.brand.name,
        image: variant.brand.image
      } : null,

      category: variant.category ? {
        id: variant.category.id,
        name: variant.category.name,
        image: variant.category.image
      } : null,

      provider: variant.provider ? {
        id: variant.provider.id,
        name: variant.provider.name
      } : null,

      unit: variant.unit ? {
        id: variant.unit.id,
        name: variant.unit.name
      } : null,

      prices: {
        buy: {
          ht: variant.buyPriceHt,
          discountPct: variant.buyDiscountPct,
          netHt: variant.buyPriceNetHt,
          ttc: variant.buyPriceTtc
        },
        sell: {
          ht: variant.sellPriceHt,
          ttc: variant.sellPriceTtc,
          margePct: variant.margePct,
          margeType: variant.margeType
        }
      },

      taxes: variant.taxes?.map((tax: any) => ({
        id: tax.id,
        name: tax.name,
        rate: tax.rate
      })) || []
    };
  }

  async indexVariant(variant: Variant) {
    const flattenedVariant = await this.flattenVariant(variant);
    return this.esService.index({
      index: this.index,
      id: variant.id.toString(),
      document: flattenedVariant,
    });
  }

  async removeVariant(id: string) {
    return this.esService.delete({ index: this.index, id });
  }

  // Re-index variants when related entities are updated
  async reindexVariantsByStore(storeId: string) {
    const variants = await this.variantRepository.find({
      where: { storeId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  async reindexVariantsByBrand(brandId: string) {
    const variants = await this.variantRepository.find({
      where: { brandId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  async reindexVariantsByCategory(categoryId: string) {
    const variants = await this.variantRepository.find({
      where: { categoryId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  async reindexVariantsByProvider(providerId: string) {
    const variants = await this.variantRepository.find({
      where: { providerId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  async reindexVariantsByUnit(unitId: string) {
    const variants = await this.variantRepository.find({
      where: { unitId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  async reindexVariantsByTax(taxId: string) {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.store', 'store')
      .leftJoinAndSelect('variant.brand', 'brand')
      .leftJoinAndSelect('variant.category', 'category')
      .leftJoinAndSelect('variant.provider', 'provider')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('variant.taxes', 'taxes')
      .where('taxes.id = :taxId', { taxId })
      .getMany();

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  async searchVariants(query: string, filters: Record<string, any> = {}) {
    const { q, page = 1, limit = 50, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);
  
    const mustFilters = Object.entries(cleanFilters).map(([key, val]) => ({
      match: { [key]: val },
    }));
  
    const shouldQuery = query?.trim()
      ? [
          {
            multi_match: {
              query,
              fields: [
                'name^3',
                'sku^2',
                'barcode',
                'description',
                'store.name^2',
                'brand.name^2',
                'category.name',
              ],
              fuzziness: 'AUTO',
              operator: 'or' as const,
            },
          },
        ]
      : [];
  
    const queryBody = shouldQuery.length
      ? {
          bool: {
            should: shouldQuery,
            filter: mustFilters,
          },
        }
      : mustFilters.length
      ? {
          bool: {
            filter: mustFilters,
          },
        }
      : {
          match_all: {},
        };
  
    return this.esService.search({
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
    });
  }
}
