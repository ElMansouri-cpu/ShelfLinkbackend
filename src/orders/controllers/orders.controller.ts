import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { Order, Status } from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderItem } from '../entities/order-item.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryDto } from '../../common/dto/query.dto';

@Controller('stores/:storeId/orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  // --- Basic CRUD endpoints ---

  @Post()
  async create(
    @Param('storeId') storeId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.service.create(storeId, createOrderDto);
  }

  @Get()
  async findAll(
    @Param('storeId') storeId: string,
    @Query() query: any,
  ) {
    return this.service.findAll(storeId, query);
  }

  @Get(':id')
  async findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(storeId, id);
  }

  @Put(':id')
  async update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.service.update(storeId, id, updateOrderDto);
  }

  @Delete(':id')
  async remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(storeId, id);
  }

  // --- Entity-specific endpoints ---

  @Post('query')
  async queryOrders(
    @Param('storeId') storeId: string,
    @Body() queryDto: QueryDto,
  ) {
    return this.service.query(storeId, queryDto, storeId);
  }

  @Get('by-id/:id')
  async getOrderById(@Param('id') id: string) {
    return this.service.getOrderById(id);
  }

  @Get('archived')
  async getArchivedOrders(@Param('storeId') storeId: string) {
    return this.service.getArchivedOrdersByStoreId(storeId);
  }

  @Get('status/:status')
  async getOrdersByStatus(
    @Param('storeId') storeId: string,
    @Param('status') status: Status,
  ) {
    return this.service.getOrdersByStoreIdAndStatus(storeId, status);
  }

  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.service.updateOrderStatus(id, updateOrderDto.status as Status);
  }

  @Put(':id/archive')
  async archiveOrder(@Param('id') id: string) {
    return this.service.archiveOrder(id);
  }

  @Get('user/:userId')
  async getOrdersByUserId(@Param('userId') userId: string) {
    return this.service.getOrdersByUserId(userId);
  }

  @Get('search')
  async searchOrders(
    @Param('storeId') storeId: string,
    @Query('q') searchTerm: string,
  ) {
    return this.service.textSearchOrders(storeId, searchTerm);
  }

  @Get('statistics')
  async getOrderStatistics(@Param('storeId') storeId: string) {
    return this.service.getOrderStatistics(storeId);
  }

  @Get('recent')
  async getRecentOrders(
    @Param('storeId') storeId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.service.getRecentOrders(storeId, limit);
  }

  @Get('date-range')
  async getOrdersByDateRange(
    @Param('storeId') storeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getOrdersByDateRange(storeId, new Date(startDate), new Date(endDate));
  }

  @Post('reindex')
  async reindexStore(@Param('storeId') storeId: string) {
    return this.service.reindexStore(storeId);
  }

  @Post('user/:userId/reindex')
  async reindexUser(@Param('userId') userId: string) {
    return this.service.reindexUser(userId);
  }

  // --- Legacy endpoint for backward compatibility ---

  @Post('legacy/create')
  async createOrderLegacy(@Body() createOrderDto: CreateOrderDto) {
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
} 