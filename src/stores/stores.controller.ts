import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { QueryDto } from '../common/dto/query.dto';

@Controller('stores')
@UseGuards(SupabaseAuthGuard)
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
  ) {}

  // --- Basic CRUD endpoints ---

  @Post()
  create(@Body() createStoreDto: CreateStoreDto, @User() user) {
    return this.storesService.create(user.id, createStoreDto);
  }

  @Get()
  findAll(@User() user, @Query() query: any) {
    return this.storesService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.findOne(user.id, id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @User() user,
  ) {
    return this.storesService.update(user.id, id, updateStoreDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.delete(user.id, id);
  }

  // --- Entity-specific endpoints ---

  @Get('elasticsearch')
  async elasticSearch(
    @User() user,
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    // Elasticsearch is disabled, return empty results
    return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }

  @Post('elasticsearch/reindex')
  async reindexUser(@User() user) {
    // Elasticsearch is disabled, return success message
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Post('query')
  queryStores(
    @User() user,
    @Body() queryDto: QueryDto,
  ) {
    return this.storesService.query(user.id, queryDto, user.id);
  }

  @Get('search')
  searchStores(
    @User() user,
    @Query('q') searchTerm: string,
  ) {
    return this.storesService.searchStores(user.id, searchTerm);
  }

  @Get('statistics')
  getStoreStatistics(@User() user) {
    return this.storesService.getStoreStatistics(user.id);
  }

  @Get('recent')
  getRecentStores(
    @User() user,
    @Query('limit') limit: number = 5,
  ) {
    return this.storesService.getRecentStores(user.id, limit);
  }

  @Get('performance/:id')
  getStorePerformance(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user,
  ) {
    return this.storesService.getStorePerformance(user.id, id);
  }

  @Patch(':id/set-primary')
  setPrimary(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.setPrimary(id, user.id);
  }

  @Patch(':id/last-active')
  updateLastActive(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.updateLastActive(id, user.id);
  }

  @Delete('orphaned/:id')
  async removeOrphanedStore(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user,
  ) {
    // Check if store has dependencies
    const dependencies = await this.storesService.checkAssociations(user.id, id);
    
    if (dependencies) {
      throw new Error(`Cannot delete store. It has associated categories, brands, or variants.`);
    }
    
    return this.storesService.delete(user.id, id);
  }

  // --- Admin endpoints ---

  @Get('admin/all')
  getAllStores() {
    return this.storesService.getAllStores();
  }

  // --- Debug endpoints (for development) ---

  @Get('debug/index')
  async debugIndex() {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Get('debug/reindex')
  async debugReindex(@User() user) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
} 