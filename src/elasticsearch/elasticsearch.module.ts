// src/elasticsearch/elasticsearch.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchManagerService } from './services/search-manager.service';
import { StartupIndexerService } from './services/startup-indexer.service';
import { StoresModule } from '../stores/stores.module';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';
import { UnitModule } from '../unit/unit.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        try {
          const username = configService.get<string>('ELASTICSEARCH_USERNAME');
          const password = configService.get<string>('ELASTICSEARCH_PASSWORD');
          const useTls = configService.get<string>('ELASTICSEARCH_TLS') === 'true';
          const node = configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200';
          
          const config: any = {
            node,
            maxRetries: 3,
            requestTimeout: 10000,
            sniffOnStart: false,
            // Disable cloud features to prevent the 'cloud' property error
            cloud: undefined,
          };

          // Only add auth if both username and password are provided
          if (username && password) {
            config.auth = {
              username,
              password,
            };
          }

          // Only add TLS if enabled
          if (useTls) {
            config.tls = {
              rejectUnauthorized: false,
            };
          }

          return config;
        } catch (error) {
          console.warn('Elasticsearch configuration error:', error.message);
          // Return a minimal configuration that won't cause the 'cloud' error
          return {
            node: 'http://localhost:9200',
            maxRetries: 0,
            requestTimeout: 5000,
            sniffOnStart: false,
            cloud: undefined,
          };
        }
      },
      inject: [ConfigService],
    }),
    StoresModule,
    forwardRef(() => BrandsModule),
    forwardRef(() => CategoriesModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => UnitModule),
    forwardRef(() => ProductsModule),
  ],
  providers: [SearchManagerService, StartupIndexerService],
  exports: [SearchManagerService, ElasticsearchModule],
})
export class SearchModule {}
