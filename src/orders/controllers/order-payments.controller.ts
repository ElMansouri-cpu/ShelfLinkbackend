import { Controller } from '@nestjs/common';
import { OrderPaymentsService } from '../services/order-payments.service';
import { OrderPayment } from '../entities/order-payment.entity';
import { CreateOrderPaymentDto } from '../dto/create-order-payment.dto';
import { UpdateOrderPaymentDto } from '../dto/update-order-payment.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/order-payments')
export class OrderPaymentsController extends StoreCrudController<
  OrderPayment,
  CreateOrderPaymentDto,
  UpdateOrderPaymentDto
> {
  constructor(protected readonly service: OrderPaymentsService) {
    super(service);
  }
} 