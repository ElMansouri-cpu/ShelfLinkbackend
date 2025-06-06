import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderSearchService extends BaseSearchService<Order> {
  protected readonly index = 'orders';
  protected readonly searchFields = [
    'id^3',
    'status^2',
    'user.username^3',
    'user.email^2',
    'store.name^2',
    'destination^2'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    super(esService);
  }

  protected async flattenEntity(order: Order): Promise<any> {
    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      orderType: order.orderType,
      destination: order.destination,
      latitude: order.latitude,
      longitude: order.longitude,
      orderDate: order.orderDate,
      storeId: order.storeId,
      userId: order.userId,
      
      store: order.store ? {
        id: order.store.id,
        name: order.store.name,
        logo: order.store.logo,
        url: order.store.url,
      } : null,
      
      user: order.user ? {
        id: order.user.id,
        username: order.user.username,
        email: order.user.email,
      } : null,
      
      items: order.items?.map(item => ({
        id: item.id,
        quantity: item.quantity,
        totalAmount: item.totalAmount,
        variant: item.variant ? {
          id: item.variant.id,
          name: item.variant.name,
          sku: item.variant.sku,
        } : null,
      })) || [],
      
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async reindexByStore(storeId: string): Promise<void> {
    const orders = await this.orderRepository.find({
      where: { storeId },
      relations: ['store', 'user', 'items', 'items.variant'],
    });

    await this.bulkIndex(orders);
  }

  async reindexByUser(userId: string): Promise<void> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['store', 'user', 'items', 'items.variant'],
    });

    await this.bulkIndex(orders);
  }
} 