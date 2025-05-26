import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controllers/products.controller';
import { Product } from './entities/product.entity';
import { Variant } from './entities/variant.entity';
import { Tax } from './entities/tax.entity';
import { VariantSpecialPrice } from './entities/variant-special-price.entity';
import { VariantPromotion } from './entities/variant-promotion.entity';
import { VariantTaxesService } from './services/variant-taxes.service';
import { VariantPricesService } from './services/variant-prices.service';
import { VariantPromotionsService } from './services/variant-promotions.service';
import { VariantTaxesController } from './controllers/variant-taxes.controller';
import { VariantPricesController } from './controllers/variant-prices.controller';
import { VariantPromotionsController } from './controllers/variant-promotions.controller';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { VariantController } from './controllers/variant.controller';
import { VariantService } from './services/variant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Variant,
      Tax,
      VariantSpecialPrice,
      VariantPromotion,
    ]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [
    VariantTaxesController,
    VariantPricesController,
    VariantPromotionsController,
    ProductsController,
    VariantController,
  ],
  providers: [
    ProductsService,
    VariantTaxesService,
    VariantPricesService,
    VariantPromotionsService,
    VariantService,
  ],
  exports: [ProductsService],
})
export class ProductsModule {} 