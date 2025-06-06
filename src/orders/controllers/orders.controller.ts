import { Controller, Post, Body, Get, Param, Put, Query } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { Order, Status } from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { OrderItem } from '../entities/order-item.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Module, forwardRef } from '@nestjs/common';

@Controller('orders')
export class OrdersController extends StoreCrudController<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  constructor(
    protected readonly service: OrdersService,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {
    super(service);
  }

  @Post('store/:storeId')
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return await this.dataSource.transaction(async (manager) => {
      const { items, ...orderData } = createOrderDto;
  
      const order = manager.create(Order, {
        ...orderData,
        orderDate: new Date(),
      });
      const savedOrder = await manager.save(order);
  
      if (items?.length > 0) {
        const orderItems = items.map((itemDto) =>
          manager.create(OrderItem, {
            ...itemDto,
            orderId: savedOrder.id,
            totalAmount: Number(itemDto.totalAmount)
          }),
        );
        await manager.save(orderItems);
        savedOrder.items = orderItems;
      }
  
      return manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['store', 'items', 'items.variant']
      });
    });
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.service.getOrderById(id);
  }

  @Get('store/:storeId')
  async getOrdersByStoreId(@Param('storeId') storeId: string) {
    return this.service.getOrdersByStoreId(storeId);
  }

  @Get('store/:storeId/archived')
  async getArchivedOrdersByStoreId(@Param('storeId') storeId: string) {
    return this.service.getArchivedOrdersByStoreId(storeId);
  }

  @Get('store/:storeId/status/:status')
  async getOrdersByStoreIdAndStatus(@Param('storeId') storeId: string, @Param('status') status: Status) {
    return this.service.getOrdersByStoreIdAndStatus(storeId, status);
  }

  @Put(':id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.service.updateOrderStatus(id, updateOrderDto.status as Status);
  }

  @Get('user/:userId')
  async getOrdersByUserId(@Param('userId') userId: string) {
    const orders = await this.service.getOrdersByUserId(userId);
    console.log(orders);
    return orders;
  }

  @Get('store/:storeId/search')
  async textSearchOrders(@Param('storeId') storeId: string, @Query('q') q: string) {
    return this.service.textSearchOrders(storeId, q);
  }

  
} 