import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, Status } from '../entities/order.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';
import { OrdersGateway } from '../orders.gateway';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Cacheable, CacheEvict, CachePatterns } from '../../cache/decorators';

@Injectable()
export class OrdersService extends StoreCrudService<Order> {
  protected readonly alias = 'order';
  protected readonly searchColumns = ['id' ,'userId','status'] as (keyof Order)[];

  constructor(
    @InjectRepository(Order)
    protected readonly repo: Repository<Order>,
    @InjectRepository(OrderItem)
    private itemRepo: Repository<OrderItem>,
    protected readonly storesService: StoresService,
    private readonly ordersGateway: OrdersGateway,
  ) {
    super(repo, storesService);
  }

  /**
   * Create order with cache invalidation
   * Invalidates store and user order caches when new order is created
   */
  @CacheEvict({
    patternGenerator: (data) => `store:${data.storeId}:orders*`,
    keyGenerator: (data) => `user:${data.userId}:orders`,
  })
  async create(data: Partial<Order>): Promise<Order> {
    const order = await super.create(data);
    this.ordersGateway.emitOrderStatus(order.id, 'pending');
    return order;
  }

  /**
   * Create complete order with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (createOrderDto) => `store:${createOrderDto.storeId}:orders*`,
    keyGenerator: (createOrderDto) => `user:${createOrderDto.userId}:orders`,
  })
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, ...orderData } = createOrderDto;
    const order = await this.repo.save(this.repo.create(orderData));
    
    if (items?.length) {
      const orderItems = items.map(item => ({
        ...item,
        order,
        totalAmount: Number(item.totalAmount)
      }));
      await this.itemRepo.save(orderItems);
    }
    
    return this.repo.findOneOrFail({ where: { id: order.id }, relations: ['items','items.variant','store'] });
  }

  /**
   * Get order by ID with caching (5 minutes TTL)
   */
  @Cacheable({
    ttl: 300, // 5 minutes
    keyGenerator: (id) => `order:${id}:full`,
  })
  async getOrderById(id: string): Promise<Order> {
    return this.repo.findOneOrFail({ where: { id }, relations: ['items'] });
  }

  /**
   * Get orders by store with caching (2 minutes TTL)
   * Orders change frequently, so shorter cache
   */
  @Cacheable({
    ttl: 120, // 2 minutes
    keyGenerator: (storeId) => `store:${storeId}:orders:active`,
  })
  async getOrdersByStoreId(storeId: string): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: true },
      order: { createdAt: 'DESC' },
      relations: [ 'items', 'items.variant','user','store']
    });
  }

  /**
   * Get archived orders by store with caching (longer TTL)
   */
  @Cacheable({
    ttl: 900, // 15 minutes (archived orders change less frequently)
    keyGenerator: (storeId) => `store:${storeId}:orders:archived`,
  })
  async getArchivedOrdersByStoreId(storeId: string): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: false },
      order: { createdAt: 'DESC' },
      relations: [ 'items', 'items.variant']
    });
  }

  /**
   * Get orders by store and status with caching
   */
  @Cacheable({
    ttl: 180, // 3 minutes
    keyGenerator: (storeId, status) => `store:${storeId}:orders:status:${status}`,
  })
  async getOrdersByStoreIdAndStatus(storeId: string, status: Status): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: true, status },
      order: { createdAt: 'DESC' },
      relations: [ 'items', 'items.variant']
    });
  }

  /**
   * Update order status with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `order:${id}*`,
    keyGenerator: (id) => `store:*:orders*`, // Invalidate all store order caches
  })
  async updateOrderStatus(id: string, status: Status): Promise<Order> {
    const order = await this.repo.findOneOrFail({ where: { id } });
    order.status = status;
    this.ordersGateway.emitOrderStatus(id, status);
    return this.repo.save(order);
  }

  /**
   * Archive order with cache invalidation
   */
  @CacheEvict({
    patternGenerator: (id) => `order:${id}*`,
    keyGenerator: (id) => `store:*:orders*`, // Invalidate all store order caches
  })
  async archiveOrder(id: string): Promise<Order> {
    const order = await this.repo.findOneOrFail({ where: { id } });
    order.isActive = false;
    return this.repo.save(order);
  }

  /**
   * Get orders by user with caching
   */
  @Cacheable(CachePatterns.User((userId) => `user:${userId}:orders`))
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['store', 'items', 'items.variant']
    });
  }

  /**
   * Get orders by status (admin function) with caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (status) => `orders:status:${status}`,
  })
  async getOrdersByStatus(status: Status): Promise<Order[]> {
    return this.repo.find({ 
      where: { status }, 
      order: { createdAt: 'DESC' },
      take: 100, // Limit for performance
    });
  }
  
  /**
   * Text search for orders with search result caching
   */
  @Cacheable(CachePatterns.Search((storeId, search) => `search:orders:${storeId}:${search}`))
  async textSearchOrders(storeId: string, search: string): Promise<Order[]> {
    console.log(search);
    return this.repo.createQueryBuilder('order')
      .leftJoinAndSelect('order.store', 'store')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .where('order.storeId = :storeId', { storeId })
      .andWhere('order.isActive = :isActive', { isActive: true })
      .andWhere(
        `("user"."username" ILIKE :search OR CAST("order"."status" AS TEXT) ILIKE :search OR CAST("order"."createdAt" AS TEXT) ILIKE :search)`,
        { search: `%${search}%` }
      )
      .orderBy('order.createdAt', 'DESC')
      .limit(50) // Limit for performance
      .getMany();
  }

  /**
   * Get order statistics with caching
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    keyGenerator: (storeId) => `store:${storeId}:order_stats`,
  })
  async getOrderStatistics(storeId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const result = await this.repo
      .createQueryBuilder('order')
      .select([
        'COUNT(*) as totalOrders',
        'COUNT(CASE WHEN order.status = \'pending\' THEN 1 END) as pendingOrders',
        'COUNT(CASE WHEN order.status = \'completed\' THEN 1 END) as completedOrders',
        'SUM(order.totalAmount) as totalRevenue',
        'AVG(order.totalAmount) as averageOrderValue',
      ])
      .where('order.storeId = :storeId', { storeId })
      .andWhere('order.isActive = true')
      .getRawOne();

    return {
      totalOrders: parseInt(result.totalOrders) || 0,
      pendingOrders: parseInt(result.pendingOrders) || 0,
      completedOrders: parseInt(result.completedOrders) || 0,
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      averageOrderValue: parseFloat(result.averageOrderValue) || 0,
    };
  }

  /**
   * Get recent orders with aggressive caching
   */
  @Cacheable({
    ttl: 60, // 1 minute (very recent data)
    keyGenerator: (storeId, limit) => `store:${storeId}:orders:recent:${limit}`,
  })
  async getRecentOrders(storeId: string, limit = 10): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: true },
      order: { createdAt: 'DESC' },
      relations: ['user', 'items'],
      take: limit,
    });
  }

  /**
   * Get orders by date range with caching
   */
  @Cacheable({
    ttl: 1800, // 30 minutes (historical data changes less)
    keyGenerator: (storeId, startDate, endDate) => `store:${storeId}:orders:range:${startDate}:${endDate}`,
  })
  async getOrdersByDateRange(storeId: string, startDate: Date, endDate: Date): Promise<Order[]> {
    return this.repo
      .createQueryBuilder('order')
      .where('order.storeId = :storeId', { storeId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }
} 