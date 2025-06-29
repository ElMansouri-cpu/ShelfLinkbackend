import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, ParseIntPipe, Query } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { QueryDto } from 'src/common/dto/query.dto';
import { Provider } from './entities/provider.entity';
import { ParseFloatPipe } from '@nestjs/common';
import { Cacheable } from '../cache/decorators';
import { ProviderSearchService } from './services/provider-search.service';

@Controller('stores/:storeId/providers')
@UseGuards(SupabaseAuthGuard)
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providerSearchService: ProviderSearchService
  ) {}

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

      return `search:providers:${keyParts.join(':')}`;
    }
  })
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    const { q, ...cleanFilters } = filters;
    return this.providerSearchService.searchEntities(query, { ...cleanFilters, storeId });
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

      return `search:providers:${keyParts.join(':')}`;
    }
  })
  async fetch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query() filters: Record<string, string>
  ) {
    return this.providerSearchService.searchEntities(q, { ...filters, storeId });
  }

  @Get('debug/index')
  async debugIndex() {
    return this.providerSearchService.debugIndex();
  }

  @Get('debug/reindex')
  async debugReindex(@Param('storeId') storeId: string) {
    await this.providerSearchService.reindexByStore(storeId);
    return { message: 'Reindex completed' };
  }

  @Get('nearby')
  @Cacheable({
    ttl: 300,
    keyGenerator: (request: any) => {
      const storeId = request.params.storeId;
      const query = request.query;
      
      const keyParts = [
        `store=${storeId}`,
        `lat=${query.lat}`,
        `lng=${query.lng}`,
        `radius=${query.radius}`
      ];

      return `search:providers:nearby:${keyParts.join(':')}`;
    }
  })
  findNearby(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('lat', new ParseFloatPipe()) latitude: number,
    @Query('lng', new ParseFloatPipe()) longitude: number,
    @Query('radius', new ParseFloatPipe()) radiusInKm: number,
    @User() user,
  ): Promise<Provider[]> {
    return this.providersService.findNearbyProviders(
      storeId,
      latitude,
      longitude,
      radiusInKm,
      user.id,
    );
  }

  @Post()
  create(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() createProviderDto: CreateProviderDto,
    @User() user,
  ) {
    if (createProviderDto.storeId !== storeId) {
      createProviderDto.storeId = storeId;
    }
    return this.providersService.create(createProviderDto, user.id);
  }

  @Get()
  findAll(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.providersService.findAll(storeId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    return this.providersService.findOne(id, storeId, user.id);
  }

  @Patch(':id')
  update(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProviderDto: UpdateProviderDto,
    @User() user,
  ) {
    return this.providersService.update(id, updateProviderDto, storeId, user.id);
  }

  @Delete(':id')
  remove(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    return this.providersService.remove(id, storeId, user.id);
  }

  @Post('filterquery')
  @Cacheable({
    ttl: 300,
    keyGenerator: (request: any) => {
      const storeId = request.params.storeId;
      const body = request.body;
      
      const keyParts = [
        `store=${storeId}`,
        `query=${JSON.stringify(body)}`
      ];

      return `search:providers:query:${keyParts.join(':')}`;
    }
  })
  queryProviders(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() queryDto: QueryDto,
    @User() user,
  ) {
    return this.providersService.queryProviders(queryDto);
  }
} 