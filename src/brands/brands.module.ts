import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { BrandSearchService } from './services/brand-search.service';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand]),
    ElasticsearchModule,
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [BrandsController],
  providers: [BrandsService, BrandSearchService, Logger],
  exports: [BrandsService, BrandSearchService],
})
export class BrandsModule {} 