import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantService } from '../services/variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { VariantSearchService } from '../services/variant-search.service';

@Controller('stores/:storeId/variants')
export class VariantController extends StoreCrudController<Variant, CreateVariantDto, UpdateVariantDto> {
  constructor(protected readonly service: VariantService, private readonly variantSearchService: VariantSearchService) {
    super(service);
  }
  @Get('fetch')
  async elasticsearch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query() filters: Record<string, string>
  ) {
    return this.variantSearchService.searchVariants(q, { ...filters, 'store.id': storeId });
  }
} 