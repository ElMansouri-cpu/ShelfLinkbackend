// src/elasticsearch/elasticsearch.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
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
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
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
