import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantService } from '../services/variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';

@Controller('stores/:storeId/variants')
export class VariantController extends StoreCrudController<Variant, CreateVariantDto, UpdateVariantDto> {
  constructor(protected readonly service: VariantService) {
    super(service);
  }


} 