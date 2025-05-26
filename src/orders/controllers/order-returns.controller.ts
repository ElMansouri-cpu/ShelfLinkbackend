import { Controller } from '@nestjs/common';
import { OrderReturnsService } from '../services/order-returns.service';
import { OrderReturn } from '../entities/order-return.entity';
import { CreateOrderReturnDto } from '../dto/create-order-return.dto';
import { UpdateOrderReturnDto } from '../dto/update-order-return.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/order-returns')
export class OrderReturnsController extends StoreCrudController<
  OrderReturn,
  CreateOrderReturnDto,
  UpdateOrderReturnDto
> {
  constructor(protected readonly service: OrderReturnsService) {
    super(service);
  }
} 