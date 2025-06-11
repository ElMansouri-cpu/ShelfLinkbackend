import { Controller, Post, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { VariantTaxesService } from '../services/variant-taxes.service';
import { Tax } from '../entities/tax.entity';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { QueryDto } from '../../common/dto/query.dto';
import { Cacheable } from '../../cache/decorators';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('stores/:storeId/products/taxes')
@UseGuards(SupabaseAuthGuard)
export class VariantTaxesController extends StoreCrudController<
  Tax,
  CreateTaxDto,
  UpdateTaxDto
> {
  constructor(protected readonly service: VariantTaxesService) {
    super(service);
  }
} 