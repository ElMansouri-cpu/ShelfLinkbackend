import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from '../entities/tax.entity';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { BaseEntityService } from '../../common/services/base-entity.service';
import { CacheService } from '../../cache/cache.service';
import { IEntityService } from '../../common/interfaces/entity-service.interface';

@Injectable()
export class VariantTaxesService extends BaseEntityService<Tax, CreateTaxDto, UpdateTaxDto> implements IEntityService<Tax, CreateTaxDto, UpdateTaxDto> {
  constructor(
    @InjectRepository(Tax)
    protected readonly repository: Repository<Tax>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateTaxDto): Promise<Tax> {
    const tax = this.repository.create({
      ...dto,
      storeId,
    });
    const savedTax = await this.repository.save(tax);
    await this.invalidateCache(storeId);
    this.logger.log('Created tax', { storeId, id: savedTax.id });
    return savedTax;
  }

  async findAll(storeId: string, query: any = {}): Promise<Tax[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<Tax[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { storeId, ...query },
        order: { createdAt: 'DESC' },
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<Tax> {
    const tax = await this.repository.findOne({ where: { id, storeId } });
    if (!tax) {
      throw new Error('Tax not found');
    }
    return tax;
  }

  async update(storeId: string, id: string, dto: UpdateTaxDto): Promise<Tax> {
    const tax = await this.findOne(storeId, id);
    Object.assign(tax, dto);
    const updatedTax = await this.repository.save(tax);
    await this.invalidateCache(storeId);
    
    this.logger.log('Updated tax', { storeId, id, taxId: updatedTax.id });
    return updatedTax;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new Error('Tax has associations and cannot be deleted.');
    }
    const tax = await this.findOne(storeId, id);
    await this.repository.remove(tax);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted tax', { storeId, id });
  }

  async query(storeId: string, queryDto: any, storeIdParam: string): Promise<Tax[]> {
    const qb = this.repository.createQueryBuilder('tax');
    
    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `tax.${filter.column}`;
        let condition = '';
        let value = filter.value;

        switch (filter.operator) {
          case 'contains':
            condition = `${column} ILIKE :${paramKey}`;
            value = `%${value}%`;
            break;
          case 'startsWith':
            condition = `${column} ILIKE :${paramKey}`;
            value = `${value}%`;
            break;
          case 'endsWith':
            condition = `${column} ILIKE :${paramKey}`;
            value = `%${value}`;
            break;
          case 'equals':
            condition = `${column} = :${paramKey}`;
            break;
        }

        qb.andWhere(condition, { [paramKey]: value });
      });
    }

    // Apply sorting
    if (queryDto.sorts) {
      queryDto.sorts.forEach((sort: any) => {
        qb.addOrderBy(`tax.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the tax is referenced in other tables (e.g., variants)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this tax is used by any variants
    const variantCount = await this.repository
      .createQueryBuilder('tax')
      .leftJoin('tax.variants', 'variants')
      .where('tax.id = :id', { id })
      .getCount();
    
    return variantCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  /**
   * Find tax by name within a store
   */
  async findByName(storeId: string, name: string): Promise<Tax | null> {
    return this.repository.findOne({
      where: { storeId, name },
    });
  }

  /**
   * Get active taxes for a store
   */
  async getActiveTaxes(storeId: string): Promise<Tax[]> {
    return this.repository.find({
      where: { storeId, isActive: true },
      order: { rate: 'ASC' },
    });
  }

  /**
   * Get tax statistics for a store
   */
  async getTaxStatistics(storeId: string): Promise<{
    totalTaxes: number;
    activeTaxes: number;
    averageRate: number;
    highestRate: number;
    lowestRate: number;
  }> {
    const taxes = await this.repository.find({
      where: { storeId },
    });

    const activeTaxes = taxes.filter(tax => tax.isActive);
    const rates = taxes.map(tax => tax.rate);

    return {
      totalTaxes: taxes.length,
      activeTaxes: activeTaxes.length,
      averageRate: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0,
      highestRate: rates.length > 0 ? Math.max(...rates) : 0,
      lowestRate: rates.length > 0 ? Math.min(...rates) : 0,
    };
  }

  /**
   * Search taxes by name
   */
  async searchTaxes(storeId: string, searchTerm: string, limit = 20): Promise<Tax[]> {
    return this.repository
      .createQueryBuilder('tax')
      .where('tax.storeId = :storeId', { storeId })
      .andWhere('tax.name ILIKE :search', { search: `%${searchTerm}%` })
      .orderBy('tax.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Toggle tax active status
   */
  async toggleActive(storeId: string, id: string): Promise<Tax> {
    const tax = await this.findOne(storeId, id);
    tax.isActive = !tax.isActive;
    const updatedTax = await this.repository.save(tax);
    await this.invalidateCache(storeId);
    this.logger.log('Toggled tax active status', { storeId, id, isActive: updatedTax.isActive });
    return updatedTax;
  }

  /**
   * Reindex taxes for a store
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      // Removed taxSearchService.reindexByStore(storeId);
      this.logger.log(`Successfully reindexed taxes for store ${storeId}`);
    } catch (error) {
      this.logger.error(`Failed to reindex taxes for store ${storeId}:`, error);
      throw error;
    }
  }
} 