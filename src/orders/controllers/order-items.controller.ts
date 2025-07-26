import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { OrderItemsService } from '../services/order-items.service';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderItemDto } from '../dto/create-order-item.dto';
import { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import { QueryDto } from '../../common/dto/query.dto';

@Controller('stores/:storeId/order-items')
export class OrderItemsController {
  constructor(private readonly service: OrderItemsService) {}

  // --- Basic CRUD endpoints ---

  @Post()
  async create(
    @Param('storeId') storeId: string,
    @Body() createOrderItemDto: CreateOrderItemDto,
  ) {
    return this.service.create(storeId, createOrderItemDto);
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
    @Body() updateOrderItemDto: UpdateOrderItemDto,
  ) {
    return this.service.update(storeId, id, updateOrderItemDto);
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
  async queryOrderItems(
    @Param('storeId') storeId: string,
    @Body() queryDto: QueryDto,
  ) {
    return this.service.query(storeId, queryDto, storeId);
  }

  @Get('order/:orderId')
  async getOrderItemsByOrderId(@Param('orderId') orderId: string) {
    return this.service.getOrderItemsByOrderId(orderId);
  }

  @Get('variant/:variantId')
  async getOrderItemsByVariantId(@Param('variantId') variantId: string) {
    return this.service.getOrderItemsByVariantId(variantId);
  }

  @Get('order/:orderId/statistics')
  async getOrderItemStatistics(@Param('orderId') orderId: string) {
    return this.service.getOrderItemStatistics(orderId);
  }
} 