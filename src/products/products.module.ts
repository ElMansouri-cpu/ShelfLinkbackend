import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { Variant } from './entities/variant.entity';
import { Tax } from './entities/tax.entity';
import { VariantTaxesService } from './services/variant-taxes.service';
import { VariantTaxesController } from './controllers/variant-taxes.controller';
import { TaxSearchService } from './services/tax-search.service';
import { VariantSearchService } from './services/variant-search.service';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { VariantController } from './controllers/variant.controller';
import { VariantService } from './services/variant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Variant,
      Tax,
    ]),
    ElasticsearchModule,
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [
    VariantTaxesController,
    VariantController,
  ],
  providers: [
    VariantTaxesService,
    VariantService,
    TaxSearchService,
    VariantSearchService,
    Logger,
  ],
  exports: [VariantService, TaxSearchService, VariantSearchService],
})
export class ProductsModule {} 