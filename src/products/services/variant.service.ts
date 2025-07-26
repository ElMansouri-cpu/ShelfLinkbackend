import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseEntityService } from '../../common/services/base-entity.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class VariantService extends BaseEntityService<Variant, CreateVariantDto, UpdateVariantDto> {
  constructor(
    @InjectRepository(Variant)
    protected readonly repository: Repository<Variant>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  /**
   * Check if the variant is referenced in other tables (e.g., orders)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Example: check if this variant is referenced in any order items
    // (You may need to inject the order items repository/service if needed)
    // For now, return false (no associations)
    return false;
  }

  // --- Entity-specific methods (not part of the base class) ---

  async findBySku(sku: string, storeId: string): Promise<Variant | null> {
    return this.repository.findOne({
      where: { sku, storeId },
      relations: ['taxes'],
    });
  }

  async findByBarcode(barcode: string, storeId: string): Promise<Variant | null> {
    return this.repository.findOne({
      where: { barcode, storeId },
      relations: ['taxes'],
    });
  }

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
} 