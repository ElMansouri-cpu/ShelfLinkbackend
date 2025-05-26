import { Controller } from '@nestjs/common';
import { ReturnOrdersService } from '../services/return-orders.service';
import { ReturnOrder } from '../entities/return-order.entity';
import { CreateReturnOrderDto } from '../dto/create-return-order.dto';
import { UpdateReturnOrderDto } from '../dto/update-return-order.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/return-orders')
export class ReturnOrdersController extends StoreCrudController<
  ReturnOrder,
  CreateReturnOrderDto,
  UpdateReturnOrderDto
> {
  constructor(protected readonly service: ReturnOrdersService) {
    super(service);
  }
} 