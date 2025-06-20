import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { StoreCrudController } from 'src/common/controllers/store-crud.controller';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './unit.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { UnitSearchService } from './services/unit-search.service';
import { Cacheable } from '../cache/decorators';

@Controller('stores/:storeId/units')
@UseGuards(SupabaseAuthGuard)
export class UnitController extends StoreCrudController<Unit, CreateUnitDto, UpdateUnitDto> {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly unitSearchService: UnitSearchService
  ) {
    super(unitsService);
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

      return `search:units:${keyParts.join(':')}`;
    }
  })
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    const { q, ...cleanFilters } = filters;
    return this.unitSearchService.searchEntities(query, { ...cleanFilters, storeId });
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

      return `search:units:${keyParts.join(':')}`;
    }
  })
  async fetch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query() filters: Record<string, string>
  ) {
    return this.unitSearchService.searchEntities(q, { ...filters, storeId });
  }

  @Get('debug/index')
  async debugIndex() {
    return this.unitSearchService.debugIndex();
  }

  @Get('debug/reindex')
  async debugReindex(@Param('storeId') storeId: string) {
    await this.unitSearchService.reindexByStore(storeId);
    return { message: 'Reindex completed' };
  }

  @Get('debug/store/:storeId')
  async debugStoreUnits(@Param('storeId') storeId: string) {
    await this.unitSearchService.debugCategoriesByStore(storeId);
    return { message: 'Debug completed, check server logs' };
  }
}
