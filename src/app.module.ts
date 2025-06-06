import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { SearchModule } from './elasticsearch/elasticsearch.module';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { AppCacheModule } from './cache/cache.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CacheInterceptor } from './cache/interceptors/cache.interceptor';
import { CacheEvictInterceptor } from './cache/interceptors/cache-evict.interceptor';

@Module({
  imports: [
    // Configuration module (must be first)
    AppConfigModule,
    
    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        throttlers: [
          {
            ttl: 60000, // 1 minute
            limit: configService.isDevelopment ? 1000 : 100, // Requests per TTL
          },
        ],
      }),
    }),
    
    // Database
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService): PostgresConnectionOptions => {
        const databaseUrl = configService.databaseUrl;
        const url = new URL(databaseUrl);
        
        const dbConfig: PostgresConnectionOptions = {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port) || 5432,
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
          synchronize: !configService.isProduction,
          logging: configService.isDevelopment ? ['query', 'error'] : ['error'],
          ssl: configService.isProduction ? {
            rejectUnauthorized: false,
          } : false,
        };

        return dbConfig;
      },
    }),
    
    // Caching
    AppCacheModule,
    
    // Monitoring
    MonitoringModule,
    
    // Health checks
    HealthModule,
    
    // Application modules
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
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Cache Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheEvictInterceptor,
    },
  ],
})
export class AppModule {}
