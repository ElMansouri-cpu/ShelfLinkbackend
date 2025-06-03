import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './services/orders.service';
import { OrdersController } from './controllers/orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemsService } from './services/order-items.service';
import { OrderItemsController } from './controllers/order-items.controller';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
 
    ]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [
    OrdersController,
    OrderItemsController,

  ],
  providers: [
    OrdersService,
    OrderItemsService,
    OrdersGateway
  ],
  exports: [
    OrdersService,
    OrderItemsService,
    OrdersGateway
  ],
})
export class OrdersModule {} 