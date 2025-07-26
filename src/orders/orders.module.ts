import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { OrdersService } from './services/orders.service';
import { OrdersController } from './controllers/orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemsService } from './services/order-items.service';
import { OrderItemsController } from './controllers/order-items.controller';
import { OrderSearchService } from './services/order-search.service';
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
    ElasticsearchModule,
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [
    OrdersController,
    OrderItemsController,
  ],
  providers: [
    OrdersService,
    OrderItemsService,
    OrderSearchService,
    OrdersGateway,
    Logger
  ],
  exports: [
    OrdersService,
    OrderItemsService,
    OrderSearchService,
    OrdersGateway,
  ],
})
export class OrdersModule {} 