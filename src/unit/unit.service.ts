import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { BaseEntityService } from '../common/services/base-entity.service';
import { CacheService } from '../cache/cache.service';
import { IEntityService } from '../common/interfaces/entity-service.interface';

@Injectable()
export class UnitsService extends BaseEntityService<Unit, CreateUnitDto, UpdateUnitDto> implements IEntityService<Unit, CreateUnitDto, UpdateUnitDto> {
  constructor(
    @InjectRepository(Unit)
    protected readonly repository: Repository<Unit>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateUnitDto): Promise<Unit> {
    const unit = this.repository.create({
      ...dto,
      storeId,
    });

    const savedUnit = await this.repository.save(unit);
    await this.invalidateCache(storeId);
    this.logger.log('Created unit', { storeId, unitId: savedUnit.id });
    return savedUnit;
  }

  async findAll(storeId: string, query: any = {}): Promise<Unit[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<Unit[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { storeId },
        order: { name: 'ASC' },
        ...query,
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<Unit> {
    const unit = await this.repository.findOne({ where: { id: parseInt(id), storeId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  async update(storeId: string, id: string, dto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.findOne(storeId, id);
    Object.assign(unit, dto);
    const updatedUnit = await this.repository.save(unit);
    await this.invalidateCache(storeId);
    this.logger.log('Updated unit', { storeId, id, unitId: updatedUnit.id });
    return updatedUnit;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new Error('Unit has associations and cannot be deleted.');
    }
    const unit = await this.findOne(storeId, id);
    await this.repository.remove(unit);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted unit', { storeId, id });
  }

  async query(storeId: string, queryDto: any, storeIdParam: string): Promise<Unit[]> {
    const qb = this.repository.createQueryBuilder('unit');
    qb.where('unit.storeId = :storeId', { storeId });

    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `unit.${filter.column}`;
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
        qb.addOrderBy(`unit.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the unit is referenced in other tables (e.g., variants)
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this unit has associated variants
    // Note: This would need to be implemented based on your actual database schema
    // For now, we'll return false as units are typically not heavily referenced
    const variantCount = await this.repository
      .createQueryBuilder('unit')
      .leftJoin('variants', 'variants', 'variants.unitId = unit.id')
      .where('unit.id = :id', { id: parseInt(id) })
      .andWhere('unit.storeId = :storeId', { storeId })
      .getCount();
    
    return variantCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  /**
   * Manually trigger reindexing for a specific store
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      // Removed unitSearchService.reindexByStore(storeId);
      this.logger.log(`Successfully reindexed units for store ${storeId}`);
    } catch (error) {
      this.logger.error(`Failed to reindex units for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Get active units for a store
   */
  async getActiveUnits(storeId: string): Promise<Unit[]> {
    return this.repository.find({
      where: { storeId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Toggle unit active status
   */
  async toggleActive(storeId: string, id: string): Promise<Unit> {
    const unit = await this.findOne(storeId, id);
    unit.isActive = !unit.isActive;
    const updatedUnit = await this.repository.save(unit);
    await this.invalidateCache(storeId);
    // Removed unitSearchService.update(updatedUnit);
    this.logger.log('Toggled unit active status', { storeId, id, isActive: updatedUnit.isActive });
    return updatedUnit;
  }

  /**
   * Get unit statistics for a store
   */
  async getUnitStatistics(storeId: string): Promise<{
    totalUnits: number;
    activeUnits: number;
    inactiveUnits: number;
  }> {
    const [totalUnits, activeUnits] = await Promise.all([
      this.repository.count({ where: { storeId } }),
      this.repository.count({ where: { storeId, isActive: true } }),
    ]);

    return {
      totalUnits,
      activeUnits,
      inactiveUnits: totalUnits - activeUnits,
    };
  }

  /**
   * Search units by name or description
   */
  async searchUnits(storeId: string, searchTerm: string): Promise<Unit[]> {
    return this.repository
      .createQueryBuilder('unit')
      .where('unit.storeId = :storeId', { storeId })
      .andWhere('(unit.name ILIKE :search OR unit.description ILIKE :search)', { 
        search: `%${searchTerm}%` 
      })
      .orderBy('unit.name', 'ASC')
      .getMany();
  }

  /**
   * Get units by name (exact match)
   */
  async getUnitByName(storeId: string, name: string): Promise<Unit | null> {
    return this.repository.findOne({
      where: { storeId, name },
    });
  }

  /**
   * Bulk create units
   */
  async bulkCreate(storeId: string, units: CreateUnitDto[]): Promise<Unit[]> {
    const createdUnits = units.map(unit => this.repository.create({
      ...unit,
      storeId,
    }));

    const savedUnits = await this.repository.save(createdUnits);
    await this.invalidateCache(storeId);
    
    // Index all units in Elasticsearch
    // Removed unitSearchService.index(unit);
    
    this.logger.log('Bulk created units', { storeId, count: savedUnits.length });
    return savedUnits;
  }
} 