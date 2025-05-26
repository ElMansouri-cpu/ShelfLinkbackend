import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../common/controllers/store-crud.controller';
import { ProductsService } from './products.service';
import { Variant } from './entities/variant.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Controller('stores/:storeId/products')
export class ProductsController extends StoreCrudController<
  Variant,
  CreateVariantDto,
  UpdateVariantDto
> {
  constructor(protected readonly service: ProductsService) {
    super(service);
  }
  
} 