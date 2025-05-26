import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './services/orders.service';
import { OrdersController } from './controllers/orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { OrderShipment } from './entities/order-shipment.entity';
import { OrderReturn } from './entities/order-return.entity';
import { ReturnOrder } from './entities/return-order.entity';
import { ReturnOrdersService } from './services/return-orders.service';
import { OrderItemsService } from './services/order-items.service';
import { OrderPaymentsService } from './services/order-payments.service';
import { OrderShipmentsService } from './services/order-shipments.service';
import { OrderReturnsService } from './services/order-returns.service';
import { ReturnOrdersController } from './controllers/return-orders.controller';
import { OrderItemsController } from './controllers/order-items.controller';
import { OrderPaymentsController } from './controllers/order-payments.controller';
import { OrderShipmentsController } from './controllers/order-shipments.controller';
import { OrderReturnsController } from './controllers/order-returns.controller';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderPayment,
      OrderShipment,
      OrderReturn,
      ReturnOrder,
    ]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [
    OrdersController,
    ReturnOrdersController,
    OrderItemsController,
    OrderPaymentsController,
    OrderShipmentsController,
    OrderReturnsController,
  ],
  providers: [
    OrdersService,
    ReturnOrdersService,
    OrderItemsService,
    OrderPaymentsService,
    OrderShipmentsService,
    OrderReturnsService,
    OrdersGateway
  ],
  exports: [
    OrdersService,
    ReturnOrdersService,
    OrderItemsService,
    OrderPaymentsService,
    OrderShipmentsService,
    OrderReturnsService,
    OrdersGateway
  ],
})
export class OrdersModule {} 