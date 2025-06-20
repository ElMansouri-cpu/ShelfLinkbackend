import { Controller, Post, Body, Param, Headers, UseGuards, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { VariantTaxesService } from '../services/variant-taxes.service';
import { Tax } from '../entities/tax.entity';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { QueryDto } from '../../common/dto/query.dto';
import { Cacheable } from '../../cache/decorators';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { TaxSearchService } from '../services/tax-search.service';

@Controller('stores/:storeId/products/taxes')
@UseGuards(SupabaseAuthGuard)
export class VariantTaxesController extends StoreCrudController<
  Tax,
  CreateTaxDto,
  UpdateTaxDto
> {
  constructor(
    protected readonly service: VariantTaxesService,
    private readonly taxSearchService: TaxSearchService
  ) {
    super(service);
  }

  @Get('elasticsearch')
  @Cacheable({
    ttl: 300,
    keyGenerator: (request: any) => {
      const storeId = request.params.storeId;
      const query = request.query;
      
      const keyParts = [
        `store=${storeId}`,
        `q=${query.q || ''}`,
        `page=${query.page || '1'}`,
        `limit=${query.limit || '20'}`
      ];

      const filters = Object.entries(query)
        .filter(([key]) => !['q', 'page', 'limit'].includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`);

      if (filters.length > 0) {
        keyParts.push(`filters=${filters.join('|')}`);
      }

      return `search:taxes:${keyParts.join(':')}`;
    }
  })
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    const { q, ...cleanFilters } = filters;
    return this.taxSearchService.searchEntities(query, { ...cleanFilters, storeId });
  }

  @Get('fetch')
  @Cacheable({
    ttl: 300,
    keyGenerator: (request: any) => {
      const storeId = request.params.storeId;
      const query = request.query;
      
      const keyParts = [
        `store=${storeId}`,
        `q=${query.q || ''}`,
        `page=${query.page || '1'}`,
        `limit=${query.limit || '20'}`
      ];

      const filters = Object.entries(query)
        .filter(([key]) => !['q', 'page', 'limit'].includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`);

      if (filters.length > 0) {
        keyParts.push(`filters=${filters.join('|')}`);
      }

      return `search:taxes:${keyParts.join(':')}`;
    }
  })
  async fetch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query() filters: Record<string, string>
  ) {
    return this.taxSearchService.searchEntities(q, { ...filters, storeId });
  }

  @Get('debug/index')
  async debugIndex() {
    return this.taxSearchService.debugIndex();
  }

  @Get('debug/reindex')
  async debugReindex(@Param('storeId') storeId: string) {
    await this.taxSearchService.reindexByStore(storeId);
    return { message: 'Reindex completed' };
  }

  @Get('debug/store/:storeId')
  async debugStoreTaxes(@Param('storeId') storeId: string) {
    await this.taxSearchService.debugCategoriesByStore(storeId);
    return { message: 'Debug completed, check server logs' };
  }
} 