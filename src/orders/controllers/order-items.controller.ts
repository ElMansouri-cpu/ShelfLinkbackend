import { Controller } from '@nestjs/common';
import { OrderItemsService } from '../services/order-items.service';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderItemDto } from '../dto/create-order-item.dto';
import { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/order-items')
export class OrderItemsController extends StoreCrudController<
  OrderItem,
  CreateOrderItemDto,
  UpdateOrderItemDto
> {
  constructor(protected readonly service: OrderItemsService) {
    super(service);
  }
} 