import { Controller } from '@nestjs/common';
import { OrderShipmentsService } from '../services/order-shipments.service';
import { OrderShipment } from '../entities/order-shipment.entity';
import { CreateOrderShipmentDto } from '../dto/create-order-shipment.dto';
import { UpdateOrderShipmentDto } from '../dto/update-order-shipment.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/order-shipments')
export class OrderShipmentsController extends StoreCrudController<
  OrderShipment,
  CreateOrderShipmentDto,
  UpdateOrderShipmentDto
> {
  constructor(protected readonly service: OrderShipmentsService) {
    super(service);
  }
} 