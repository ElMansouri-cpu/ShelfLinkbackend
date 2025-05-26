import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantService } from '../services/variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { User } from '../../auth/decorators/user.decorator';

@Controller('stores/:storeId/variants')
export class VariantController extends StoreCrudController<Variant, CreateVariantDto, UpdateVariantDto> {
  constructor(protected readonly service: VariantService) {
    super(service);
  }


} 