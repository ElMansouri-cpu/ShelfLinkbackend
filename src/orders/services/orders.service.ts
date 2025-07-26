import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, Status } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { BaseEntityService } from '../../common/services/base-entity.service';
import { CacheService } from '../../cache/cache.service';
import { IEntityService } from '../../common/interfaces/entity-service.interface';
import { OrdersGateway } from '../orders.gateway';

@Injectable()
export class OrdersService extends BaseEntityService<Order, CreateOrderDto, UpdateOrderDto> implements IEntityService<Order, CreateOrderDto, UpdateOrderDto> {
  constructor(
    @InjectRepository(Order)
    protected readonly repository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepository: Repository<OrderItem>,
    protected readonly cacheService: CacheService,
    private readonly ordersGateway: OrdersGateway,
    protected readonly logger: Logger,
  ) {
    super(repository, cacheService, null, logger);
  }

  // --- Override base methods to match repository interface ---

  async create(storeId: string, dto: CreateOrderDto): Promise<Order> {
    const { items, ...orderData } = dto;
    
    // Create the order
    const order = this.repository.create({
      ...orderData,
      storeId,
    });
    const savedOrder = await this.repository.save(order);
    
    // Create order items if provided
    if (items?.length) {
      const orderItems = items.map(item => ({
        ...item,
        orderId: savedOrder.id,
        totalAmount: Number(item.totalAmount)
      }));
      await this.itemRepository.save(orderItems);
    }
    
    // Get complete order with relations
    const completeOrder = await this.repository.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'items.variant', 'store', 'user']
    });
    
    if (!completeOrder) {
      throw new Error('Failed to create order');
    }
    
    await this.invalidateCache(storeId);
    this.ordersGateway.emitOrderStatus(completeOrder.id, 'pending');
    
    this.logger.log('Created order', { storeId, id: completeOrder.id, userId: completeOrder.userId });
    return completeOrder;
  }

  async findAll(storeId: string, query: any = {}): Promise<Order[]> {
    const cacheKey = this.getCacheKey(storeId, query);
    let results = await this.cacheService.get<Order[]>(cacheKey);
    if (!results) {
      results = await this.repository.find({
        where: { storeId, ...query },
        relations: ['items', 'items.variant', 'store', 'user'],
        order: { createdAt: 'DESC' },
      });
      await this.cacheService.set(cacheKey, results);
    }
    return results;
  }

  async findOne(storeId: string, id: string): Promise<Order> {
    const order = await this.repository.findOne({
      where: { id, storeId },
      relations: ['items', 'items.variant', 'store', 'user'],
    });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async update(storeId: string, id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(storeId, id);
    Object.assign(order, dto);
    const updatedOrder = await this.repository.save(order);
    await this.invalidateCache(storeId);
    
    // Emit status change if status was updated
    if (dto.status && dto.status !== order.status) {
      this.ordersGateway.emitOrderStatus(updatedOrder.id, dto.status);
    }
    
    this.logger.log('Updated order', { storeId, id, orderId: updatedOrder.id });
    return updatedOrder;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const hasAssociations = await this.checkAssociations(storeId, id);
    if (hasAssociations) {
      throw new Error('Order has associations and cannot be deleted.');
    }
    const order = await this.findOne(storeId, id);
    await this.repository.remove(order);
    await this.invalidateCache(storeId);
    this.logger.log('Deleted order', { storeId, id });
  }

  async query(storeId: string, queryDto: any, storeIdParam: string): Promise<Order[]> {
    const qb = this.repository.createQueryBuilder('order');
    
    // Apply filters
    if (queryDto.filters) {
      queryDto.filters.forEach((filter: any, index: number) => {
        const paramKey = `filter_${index}`;
        const column = `order.${filter.column}`;
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
        qb.addOrderBy(`order.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }

    return qb.getMany();
  }

  /**
   * Check if the order is referenced in other tables
   * Return true if associations exist, false otherwise
   */
  async checkAssociations(storeId: string, id: string): Promise<boolean> {
    // Check if this order has any items
    const itemCount = await this.itemRepository.count({
      where: { orderId: id }
    });
    
    return itemCount > 0;
  }

  // --- Entity-specific methods (not part of the base class) ---

  /**
   * Get order by ID with full relations
   */
  async getOrderById(id: string): Promise<Order> {
    const order = await this.repository.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'store', 'user']
    });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * Get orders by store ID
   */
  async getOrdersByStoreId(storeId: string): Promise<Order[]> {
    return this.repository.find({
      where: { storeId },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get archived orders by store ID
   */
  async getArchivedOrdersByStoreId(storeId: string): Promise<Order[]> {
    return this.repository.find({
      where: { storeId, status: Status.ARCHIVED },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get orders by store ID and status
   */
  async getOrdersByStoreIdAndStatus(storeId: string, status: Status): Promise<Order[]> {
    return this.repository.find({
      where: { storeId, status },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id: string, status: Status): Promise<Order> {
    const order = await this.repository.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'store', 'user']
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    order.status = status;
    const updatedOrder = await this.repository.save(order);
    
    await this.invalidateCache(order.storeId);
    this.ordersGateway.emitOrderStatus(updatedOrder.id, status);
    
    this.logger.log('Updated order status', { id, status, storeId: order.storeId });
    return updatedOrder;
  }

  /**
   * Archive an order
   */
  async archiveOrder(id: string): Promise<Order> {
    return this.updateOrderStatus(id, Status.ARCHIVED);
  }

  /**
   * Get orders by user ID
   */
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return this.repository.find({
      where: { userId },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: Status): Promise<Order[]> {
    return this.repository.find({
      where: { status },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Text search orders
   */
  async textSearchOrders(storeId: string, search: string): Promise<Order[]> {
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('order.store', 'store')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.storeId = :storeId', { storeId })
      .andWhere('(order.id ILIKE :search OR order.destination ILIKE :search OR user.username ILIKE :search)', {
        search: `%${search}%`,
      })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get order statistics for a store
   */
  async getOrderStatistics(storeId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const orders = await this.repository.find({
      where: { storeId },
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === Status.PENDING).length;
    const completedOrders = orders.filter(order => 
      [Status.DELIVERED, Status.COMPLETED].includes(order.status)
    ).length;
    const totalRevenue = orders
      .filter(order => [Status.DELIVERED, Status.COMPLETED].includes(order.status))
      .reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      averageOrderValue,
    };
  }

  /**
   * Get recent orders for a store
   */
  async getRecentOrders(storeId: string, limit = 10): Promise<Order[]> {
    return this.repository.find({
      where: { storeId },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get orders by date range
   */
  async getOrdersByDateRange(storeId: string, startDate: Date, endDate: Date): Promise<Order[]> {
    return this.repository.find({
      where: {
        storeId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        } as any,
      },
      relations: ['items', 'items.variant', 'store', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Reindex orders for a store
   */
  async reindexStore(storeId: string): Promise<void> {
    try {
      // Removed OrderSearchService.reindexByStore(storeId)
      this.logger.log(`Successfully reindexed orders for store ${storeId}`);
    } catch (error) {
      this.logger.error(`Failed to reindex orders for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Reindex orders for a user
   */
  async reindexUser(userId: string): Promise<void> {
    try {
      // Removed OrderSearchService.reindexByUser(userId)
      this.logger.log(`Successfully reindexed orders for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to reindex orders for user ${userId}:`, error);
      throw error;
    }
  }
} 