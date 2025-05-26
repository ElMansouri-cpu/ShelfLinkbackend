import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, Status } from '../entities/order.entity';
import { StoreCrudService } from '../../common/services/store-crud.service';
import { StoresService } from '../../stores/stores.service';
import { OrdersGateway } from '../orders.gateway';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';

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

  async create(data: Partial<Order>): Promise<Order> {
    const order = await super.create(data);
    this.ordersGateway.emitOrderStatus(order.id, 'pending');
    return order;
  }

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

  async getOrderById(id: string): Promise<Order> {
    return this.repo.findOneOrFail({ where: { id }, relations: ['items'] });
  }
  async getOrdersByStoreId(storeId: string): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: true },
      order: { createdAt: 'DESC' },
      relations: [ 'items', 'items.variant','user','store']

    });
  }
  async getArchivedOrdersByStoreId(storeId: string): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: false },
      order: { createdAt: 'DESC' },
      relations: [ 'items', 'items.variant']
    });
  }
  async getOrdersByStoreIdAndStatus(storeId: string, status: Status): Promise<Order[]> {
    return this.repo.find({
      where: { storeId, isActive: true, status },
      order: { createdAt: 'DESC' },
      relations: [ 'items', 'items.variant']
    });
  }
  async updateOrderStatus(id: string, status: Status): Promise<Order> {
    const order = await this.repo.findOneOrFail({ where: { id } });
    order.status = status;
    return this.repo.save(order);
  }

  async archiveOrder(id: string): Promise<Order> {
    const order = await this.repo.findOneOrFail({ where: { id } });
    order.isActive = false;
    return this.repo.save(order);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['store', 'items', 'items.variant']
    });
  }

  async getOrdersByStatus(status: Status): Promise<Order[]> {
    return this.repo.find({ where: { status }, order: { createdAt: 'DESC' } });
  }
  
  // text search for orders(user(name) ,status, createdAt) by storeID
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
      .getMany();
  }
  
  

} 