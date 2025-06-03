import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from './supabase/supabase.module';
import { StoresModule } from './stores/stores.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProvidersModule } from './providers/providers.module';
import { Store } from './stores/entities/store.entity';
import { User } from './users/entities/user.entity';
import { Category } from './categories/entities/category.entity';
import { Brand } from './brands/entities/brand.entity';
import { Provider } from './providers/entities/provider.entity';
import { UnitModule } from './unit/unit.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { Variant } from './products/entities/variant.entity';
import { Tax } from './products/entities/tax.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Unit } from './unit/entities/unit.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): PostgresConnectionOptions => {
        const databaseUrl = configService.get('DATABASE_URL');
        const url = new URL(databaseUrl);
        
        const dbConfig: PostgresConnectionOptions = {
          type: 'postgres',
          host: url.hostname,
          ssl: {
            rejectUnauthorized: false,
          },
          port: parseInt(url.port),
          username: url.username,
          password: url.password,
          database: url.pathname.substring(1),
          entities: [
            Store,
            User,
            Category,
            Brand,
            Provider,
            Variant,
            Tax,
            Order,
            OrderItem,
            Unit,
          ],
        };

        

        return dbConfig;
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    SupabaseModule,
    StoresModule,
    CategoriesModule,
    BrandsModule,
    ProvidersModule,
    UnitModule,
    ProductsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
