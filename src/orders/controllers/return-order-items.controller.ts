import { Controller } from '@nestjs/common';
import { ReturnOrderItemsService } from '../services/return-order-items.service';
import { ReturnOrderItem } from '../entities/return-order-item.entity';
import { CreateReturnOrderItemDto } from '../dto/create-return-order-item.dto';
import { UpdateReturnOrderItemDto } from '../dto/update-return-order-item.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/return-order-items')
export class ReturnOrderItemsController extends StoreCrudController<
  ReturnOrderItem,
  CreateReturnOrderItemDto,
  UpdateReturnOrderItemDto
> {
  constructor(protected readonly service: ReturnOrderItemsService) {
    super(service);
  }
} 