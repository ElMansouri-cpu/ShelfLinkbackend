import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { SearchModule } from '../elasticsearch/elasticsearch.module';
import { BrandSearchService } from './services/brand-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand]),
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SearchModule),
  ],
  controllers: [BrandsController],
  providers: [BrandsService, BrandSearchService],
  exports: [BrandsService, BrandSearchService],
})
export class BrandsModule {} 