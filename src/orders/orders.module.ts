import { Module, forwardRef } from '@nestjs/common';
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
import { OrderSearchService } from './services/order-search.service';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
    ]),
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SearchModule),
  ],
  controllers: [
    OrdersController,
    OrderItemsController,
  ],
  providers: [
    OrdersService,
    OrderItemsService,
    OrdersGateway,
    OrderSearchService
  ],
  exports: [
    OrdersService,
    OrderItemsService,
    OrdersGateway,
    OrderSearchService
  ],
})
export class OrdersModule {} 