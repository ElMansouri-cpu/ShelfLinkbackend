import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantPricesService } from '../services/variant-prices.service';
import { VariantSpecialPrice } from '../entities/variant-special-price.entity';
import { CreateVariantPriceDto } from '../dto/create-variant-price.dto';
import { UpdateVariantPriceDto } from '../dto/update-variant-price.dto';

@Controller('stores/:storeId/products/:variantId/prices')
export class VariantPricesController extends StoreCrudController<VariantSpecialPrice, CreateVariantPriceDto, UpdateVariantPriceDto> {
  constructor(protected readonly service: VariantPricesService) {
    super(service);
  }
} 