import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderItemDto } from '../dto/create-order-item.dto';
import { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import { BaseEntityService } from '../../common/services/base-entity.service';
import { CacheService } from '../../cache/cache.service';
import { IEntityService } from '../../common/interfaces/entity-service.interface';

@Injectable()
export class OrderItemsService extends BaseEntityService<OrderItem, CreateOrderItemDto, UpdateOrderItemDto> implements IEntityService<OrderItem, CreateOrderItemDto, UpdateOrderItemDto> {
  constructor(
    @InjectRepository(OrderItem)
    protected readonly repository: Repository<OrderItem>,
    protected readonly cacheService: CacheService,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateOrderItemDto): Promise<OrderItem> {
    const orderItem = this.repository.create({
      ...dto,
      orderId: dto.orderId,
    });
    const savedOrderItem = await this.repository.save(orderItem);
    await this.invalidateCache(storeId);
    this.logger.log('Created order item', { storeId, id: savedOrderItem.id, orderId: savedOrderItem.orderId });
    return savedOrderItem;
  }

  async findAll(storeId: string, query: any = {}): Promise<OrderItem[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<OrderItem[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { ...query },
        relations: ['order', 'variant'],
        order: { createdAt: 'DESC' },
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<OrderItem> {
    const orderItem = await this.repository.findOne({
      where: { id },
      relations: ['order', 'variant'],
    });
    if (!orderItem) {
      throw new Error('Order item not found');
    }
    return orderItem;
  }

  async update(storeId: string, id: string, dto: UpdateOrderItemDto): Promise<OrderItem> {
    const orderItem = await this.findOne(storeId, id);
    Object.assign(orderItem, dto);
    const updatedOrderItem = await this.repository.save(orderItem);
    await this.invalidateCache(storeId);
    this.logger.log('Updated order item', { storeId, id, orderItemId: updatedOrderItem.id });
    return updatedOrderItem;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new Error('Order item has associations and cannot be deleted.');
    }
    const orderItem = await this.findOne(storeId, id);
    await this.repository.remove(orderItem);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted order item', { storeId, id });
  }

  async query(storeId: string, queryDto: any, storeIdParam: string): Promise<OrderItem[]> {
    const qb = this.repository.createQueryBuilder('orderItem');
    
    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `orderItem.${filter.column}`;
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
        qb.addOrderBy(`orderItem.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the order item is referenced in other tables
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Order items don't typically have external associations
    return false;
  }

  // --- Entity-specific methods (not part of the base class) ---

  /**
   * Get order items by order ID
   */
  async getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return this.repository.find({
      where: { orderId },
      relations: ['variant'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get order items by variant ID
   */
  async getOrderItemsByVariantId(variantId: string): Promise<OrderItem[]> {
    return this.repository.find({
      where: { variantId },
      relations: ['order', 'variant'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get order item statistics
   */
  async getOrderItemStatistics(orderId: string): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalAmount: number;
    averageQuantity: number;
  }> {
    const items = await this.repository.find({
      where: { orderId },
    });

    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const averageQuantity = totalItems > 0 ? totalQuantity / totalItems : 0;

    return {
      totalItems,
      totalQuantity,
      totalAmount,
      averageQuantity,
    };
  }
} 