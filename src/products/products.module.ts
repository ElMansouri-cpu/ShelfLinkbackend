import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variant } from './entities/variant.entity';
import { Tax } from './entities/tax.entity';
import { VariantTaxesService } from './services/variant-taxes.service';
import { VariantTaxesController } from './controllers/variant-taxes.controller';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { VariantController } from './controllers/variant.controller';
import { VariantService } from './services/variant.service';
import { VariantSearchService } from './services/variant-search.service';
import { SearchModule } from '../elasticsearch/elasticsearch.module';
import { TaxSearchService } from './services/tax-search.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Variant,
      Tax,
    ]),
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SearchModule),
  ],
  controllers: [
    VariantTaxesController,
    VariantController,
  ],
  providers: [
    VariantTaxesService,
    VariantService,
    VariantSearchService,
    TaxSearchService,
  ],
  exports: [VariantService, VariantSearchService, TaxSearchService],
})
export class ProductsModule {} 