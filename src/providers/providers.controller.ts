import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, ParseIntPipe, Query, ParseFloatPipe } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { Provider } from './entities/provider.entity';
import { QueryDto } from '../common/dto/query.dto';

@Controller('stores/:storeId/providers')
@UseGuards(SupabaseAuthGuard)
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
  ) {}

  // --- Basic CRUD endpoints ---

  @Post()
  create(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() createProviderDto: CreateProviderDto,
    @User() user,
  ) {
    if (createProviderDto.storeId !== storeId) {
      createProviderDto.storeId = storeId;
    }
    return this.providersService.create(storeId, createProviderDto);
  }

  @Get()
  findAll(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query() query: any,
    @User() user,
  ) {
    return this.providersService.findAll(storeId, query);
  }

  @Get(':id')
  findOne(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id') id: string,
    @User() user,
  ) {
    return this.providersService.findOne(storeId, id);
  }

  @Patch(':id')
  update(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
    @User() user,
  ) {
    return this.providersService.update(storeId, id, updateProviderDto);
  }

  @Delete(':id')
  remove(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id') id: string,
    @User() user,
  ) {
    return this.providersService.delete(storeId, id);
  }

  // --- Entity-specific endpoints ---

  @Get('elasticsearch')
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    // Elasticsearch is disabled, return empty results
    return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }

  @Post('elasticsearch/reindex')
  async reindexStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    // Elasticsearch is disabled, return success message
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Post('query')
  queryProviders(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() queryDto: QueryDto,
    @User() user,
  ) {
    return this.providersService.query(storeId, queryDto, user.id);
  }

  @Get('search')
  textSearchProviders(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') search: string,
    @User() user,
  ) {
    return this.providersService.textSearchProviders(storeId, search);
  }

  @Get('nearby')
  findNearby(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('lat', new ParseFloatPipe()) latitude: number,
    @Query('lng', new ParseFloatPipe()) longitude: number,
    @Query('radius', new ParseFloatPipe()) radiusInKm: number,
    @User() user,
  ): Promise<Provider[]> {
    return this.providersService.findNearbyProviders(storeId, latitude, longitude, radiusInKm);
  }

  @Get('statistics')
  getProviderStatistics(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.providersService.getProviderStatistics(storeId);
  }

  @Get('status/:status')
  getProvidersByStatus(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('status') status: 'active' | 'inactive',
    @User() user,
  ) {
    return this.providersService.getProvidersByStatus(storeId, status);
  }

  @Get('top-rated')
  getTopRatedProviders(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('limit') limit: number = 10,
    @User() user,
  ) {
    return this.providersService.getTopRatedProviders(storeId, limit);
  }

  @Patch(':id/rating')
  updateProviderRating(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rating: number },
    @User() user,
  ) {
    return this.providersService.updateProviderRating(id, storeId, body.rating);
  }

  @Delete('orphaned/:id')
  async removeOrphanedProvider(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    // Check if provider has dependencies
    const dependencies = await this.providersService.checkAssociations(storeId, id.toString());
    
    if (dependencies) {
      throw new Error(`Cannot delete provider. It has associated variants or orders.`);
    }
    
    return this.providersService.delete(storeId, id.toString());
  }

  // --- Debug endpoints (for development) ---

  @Get('debug/index')
  async debugIndex() {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Get('debug/reindex')
  async debugReindex(@Param('storeId') storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
} 