import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { Variant } from '../entities/variant.entity';
import { StoresService } from '../../stores/stores.service';
import { VariantSearchService } from './variant-search.service';
import { Cacheable, CacheEvict, CachePatterns } from '../../cache/decorators';

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

  /**
   * Create variant with cache invalidation
   * Invalidates store product caches when new variant is created
   */
  @CacheEvict({
    patternGenerator: (data) => `store:${data.storeId}:variants*`,
  })
  async create(data: Partial<Variant>): Promise<Variant> {
    const variant = await super.create(data);
    await this.variantSearchService.indexVariant(variant);
    return variant;
  }

  /**
   * Find all variants with caching (5 minutes TTL)
   * Cache varies by query parameters
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (where) => `variants:all:${JSON.stringify(where || {})}`,
  })
  async findAll(where?: any): Promise<Variant[]> {
    return this.repository.find({
      where,
      relations: ['taxes']
    });
  }

  /**
   * Find variants by store with caching
   */
  @Cacheable(CachePatterns.Store((storeId) => `store:${storeId}:variants`))
  async findByStore(storeId: string): Promise<Variant[]> {
    return this.repository.find({
      where: { storeId },
      relations: ['taxes'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find single variant with caching
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (id, whereExtra = {}) => `variant:${id}:${JSON.stringify(whereExtra)}`,
  })
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

  /**
   * Remove variant with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id, whereExtra = {}) => `variant:${id}*`,
  })
  async remove(id: string | number, whereExtra: any = {}): Promise<void> {
    await super.remove(id, whereExtra);
    await this.variantSearchService.removeVariant(id.toString());
  }

  /**
   * Update variant with selective cache eviction
   */
  @CacheEvict({
    patternGenerator: (id, data, whereExtra = {}) => `variant:${id}*`,
  })
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

  /**
   * Get variants by SKU with caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (sku, storeId) => `variant:sku:${sku}:store:${storeId}`,
  })
  async findBySku(sku: string, storeId: string): Promise<Variant | null> {
    return this.repository.findOne({
      where: { sku, storeId },
      relations: ['taxes'],
    });
  }

  /**
   * Get variants by barcode with caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (barcode, storeId) => `variant:barcode:${barcode}:store:${storeId}`,
  })
  async findByBarcode(barcode: string, storeId: string): Promise<Variant | null> {
    return this.repository.findOne({
      where: { barcode, storeId },
      relations: ['taxes'],
    });
  }

  /**
   * Search variants with search result caching
   */
  @Cacheable(CachePatterns.Search((storeId, searchTerm) => `search:variants:${storeId}:${searchTerm}`))
  async searchVariants(storeId: string, searchTerm: string, limit = 20): Promise<Variant[]> {
    return this.repository
      .createQueryBuilder('variant')
      .where('variant.storeId = :storeId', { storeId })
      .andWhere('(variant.name ILIKE :search OR variant.sku ILIKE :search OR variant.barcode ILIKE :search)', {
        search: `%${searchTerm}%`,
      })
      .leftJoinAndSelect('variant.taxes', 'taxes')
      .orderBy('variant.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get low stock variants with caching
   */
  @Cacheable({
    ttl: 180, // 3 minutes (more frequent updates for stock)
    keyGenerator: (storeId, threshold) => `store:${storeId}:low_stock:${threshold}`,
  })
  async getLowStockVariants(storeId: string, threshold = 10): Promise<Variant[]> {
    return this.repository
      .createQueryBuilder('variant')
      .where('variant.storeId = :storeId', { storeId })
      .andWhere('variant.stock <= :threshold', { threshold })
      .andWhere('variant.trackStock = true')
      .orderBy('variant.stock', 'ASC')
      .limit(50)
      .getMany();
  }

  /**
   * Get variant statistics with caching
   */
  @Cacheable({
    ttl: 900, // 15 minutes
    keyGenerator: (storeId) => `store:${storeId}:variant_stats`,
  })
  async getVariantStatistics(storeId: string): Promise<{
    totalVariants: number;
    activeVariants: number;
    lowStockVariants: number;
    averagePrice: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('variant')
      .select([
        'COUNT(*) as totalVariants',
        'COUNT(CASE WHEN variant.isActive = true THEN 1 END) as activeVariants',
        'COUNT(CASE WHEN variant.stock <= 10 AND variant.trackStock = true THEN 1 END) as lowStockVariants',
        'AVG(variant.price) as averagePrice',
      ])
      .where('variant.storeId = :storeId', { storeId })
      .getRawOne();

    return {
      totalVariants: parseInt(result.totalVariants) || 0,
      activeVariants: parseInt(result.activeVariants) || 0,
      lowStockVariants: parseInt(result.lowStockVariants) || 0,
      averagePrice: parseFloat(result.averagePrice) || 0,
    };
  }
} 