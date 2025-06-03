import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Variant,
      Tax,
    ]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [
    VariantTaxesController,
 

    VariantController,
  ],
  providers: [
    VariantTaxesService,
    VariantService,
  ],
  exports: [],
})
export class ProductsModule {} 