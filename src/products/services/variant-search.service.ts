// src/variants/variant-search.service.ts
import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from '../entities/variant.entity';
import { Cacheable, CacheEvict, CachePatterns } from '../../cache/decorators';

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

  /**
   * Index variant with cache invalidation
   * Clears search caches when variant is indexed
   */
  @CacheEvict({
    patternGenerator: (variant) => `search:variants:*`,
  })
  async indexVariant(variant: Variant) {
    const flattenedVariant = await this.flattenVariant(variant);
    return this.esService.index({
      index: this.index,
      id: variant.id.toString(),
      document: flattenedVariant,
    });
  }

  /**
   * Remove variant with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `search:variants:*`,
  })
  async removeVariant(id: string) {
    return this.esService.delete({ index: this.index, id });
  }

  // Re-index variants when related entities are updated
  @CacheEvict({
    patternGenerator: (storeId) => `search:variants:*`,
  })
  async reindexVariantsByStore(storeId: string) {
    const variants = await this.variantRepository.find({
      where: { storeId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (brandId) => `search:variants:*`,
  })
  async reindexVariantsByBrand(brandId: string) {
    const variants = await this.variantRepository.find({
      where: { brandId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (categoryId) => `search:variants:*`,
  })
  async reindexVariantsByCategory(categoryId: string) {
    const variants = await this.variantRepository.find({
      where: { categoryId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (providerId) => `search:variants:*`,
  })
  async reindexVariantsByProvider(providerId: string) {
    const variants = await this.variantRepository.find({
      where: { providerId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (unitId) => `search:variants:*`,
  })
  async reindexVariantsByUnit(unitId: string) {
    const variants = await this.variantRepository.find({
      where: { unitId },
      relations: ['store', 'brand', 'category', 'provider', 'unit', 'taxes']
    });

    for (const variant of variants) {
      await this.indexVariant(variant);
    }
  }

  @CacheEvict({
    patternGenerator: (taxId) => `search:variants:*`,
  })
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

  /**
   * Search variants with comprehensive caching
   * Cache varies by query, pagination, and filters
   */
    // @Cacheable({
    //   ttl: 300, // 5 minutes for search results
    //   keyGenerator: (query, filters = {}) => {
    //     const { page = 1, limit = 50, ...cleanFilters } = filters;
    //     const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
    //     return `search:variants:${query || 'all'}:page:${page}:limit:${limit}:filters:${filtersKey}`;
    //   },
    // })
  async searchVariants(query: string, filters: Record<string, any> = {}) {
    const { q, page = 1, limit = 50, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);
  
    const mustFilters = Object.entries(cleanFilters).map(([key, val]) => ({
      match: { [key]: val },
    }));
  
    const shouldQuery = query?.trim()
      ? [
          // Multi-match for fuzzy text search
          {
            multi_match: {
              query,
              fields: [
                'name^3',           // Boost name matches
                'sku^2',           // Boost SKU matches
                'barcode',         // Regular barcode matches
                'description',     // Description matches
                'store.name^2',    // Boost store name matches
                'brand.name^2',    // Boost brand name matches
                'category.name^2', // Boost category name matches
                'provider.name',   // Provider name matches
                'unit.name'        // Unit name matches
              ],
              type: 'best_fields' as const,
              fuzziness: 'AUTO',
              operator: 'or' as const,
              minimum_should_match: '2<75%',
              tie_breaker: 0.3
            }
          },
          // Wildcard query for substring matching
          {
            bool: {
              should: [
                { wildcard: { name: { value: `*${query}*` } } },
                { wildcard: { sku: { value: `*${query}*` } } },
                { wildcard: { barcode: { value: `*${query}*` } } },
                { wildcard: { description: { value: `*${query}*` } } },
                { wildcard: { 'store.name': { value: `*${query}*` } } },
                { wildcard: { 'brand.name': { value: `*${query}*` } } },
                { wildcard: { 'category.name': { value: `*${query}*` } } },
                { wildcard: { 'provider.name': { value: `*${query}*` } } },
                { wildcard: { 'unit.name': { value: `*${query}*` } } }
              ],
              minimum_should_match: 1
            }
          }
        ]
      : [];
  
    const queryBody = shouldQuery.length
      ? {
          bool: {
            should: shouldQuery,
            filter: mustFilters,
            minimum_should_match: 1
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
  
    const response = await this.esService.search({
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
      sort: [
        { _score: { order: 'desc' } },  // Sort by relevance first
        { sku: { order: 'asc' } }       // Then alphabetically by SKU
      ]
    });

    // Transform to simplified response format
    const total = typeof response.hits.total === 'number' 
      ? response.hits.total 
      : response.hits.total?.value || 0;

    const totalPages = Math.ceil(total / Number(limit));

    return {
      data: response.hits.hits.map((hit: any) => hit._source),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPreviousPage: Number(page) > 1,
      },
    };
  }
}
