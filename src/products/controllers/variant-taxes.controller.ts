import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { VariantTaxesService } from '../services/variant-taxes.service';
import { Tax } from '../entities/tax.entity';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { QueryDto } from '../../common/dto/query.dto';

@Controller('stores/:storeId/products/taxes')
export class VariantTaxesController extends StoreCrudController<
  Tax,
  CreateTaxDto,
  UpdateTaxDto
> {
  constructor(protected readonly service: VariantTaxesService) {
    super(service);
  }
} 