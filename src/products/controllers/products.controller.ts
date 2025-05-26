import { Controller } from '@nestjs/common';
import { ProductsService } from '../services/products.service';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/products')
export class ProductsController extends StoreCrudController<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(protected readonly service: ProductsService) {
    super(service);
  }
} 