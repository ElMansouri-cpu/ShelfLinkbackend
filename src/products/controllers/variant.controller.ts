import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantService } from '../services/variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { VariantSearchService } from '../services/variant-search.service';
import { Cacheable } from '../../cache/decorators';

@Controller('stores/:storeId/variants')
export class VariantController extends StoreCrudController<Variant, CreateVariantDto, UpdateVariantDto> {
  constructor(protected readonly service: VariantService, private readonly variantSearchService: VariantSearchService) {
    super(service);
  }
  
  @Get('fetch')
  @Cacheable({
    ttl: 300, // 5 minutes for search results
    keyGenerator: (storeId, q = '', filters = {}) => {
      // Ensure we get string values and not objects
      const queryString = String(q || '');
      const storeIdString = String(storeId || '');
      const { page = 1, limit = 20, ...cleanFilters } = filters || {};
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:variants:${queryString || 'all'}:page:${page}:limit:${limit}:filters:${filtersKey}:store:${storeIdString}`;
    },
  })
  async elasticsearch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query() filters: Record<string, string>
  ) {
    return this.variantSearchService.searchVariants(q, { ...filters, 'store.id': storeId });
  }
} 