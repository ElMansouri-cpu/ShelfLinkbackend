import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { UnitsService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { QueryDto } from '../common/dto/query.dto';

@Controller('stores/:storeId/units')
@UseGuards(SupabaseAuthGuard)
export class UnitController {
  constructor(
    private readonly unitsService: UnitsService,
  ) {}

  // --- Basic CRUD endpoints ---

  @Post()
  create(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() createUnitDto: CreateUnitDto,
  ) {
    return this.unitsService.create(storeId, createUnitDto);
  }

  @Get()
  findAll(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: any,
  ) {
    return this.unitsService.findAll(storeId, query);
  }

  @Get(':id')
  findOne(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id') id: string,
  ) {
    return this.unitsService.findOne(storeId, id);
  }

  @Put(':id')
  update(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    return this.unitsService.update(storeId, id, updateUnitDto);
  }

  @Delete(':id')
  remove(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id') id: string,
  ) {
    return this.unitsService.delete(storeId, id);
  }

  // --- Entity-specific endpoints ---

  @Get('elasticsearch')
  async elasticSearch(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    // Elasticsearch is disabled, return empty results
    return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }

  @Post('elasticsearch/reindex')
  async reindexStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    // Elasticsearch is disabled, return success message
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Post('query')
  queryUnits(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() queryDto: QueryDto,
  ) {
    return this.unitsService.query(storeId, queryDto, storeId);
  }

  @Get('search')
  searchUnits(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') searchTerm: string,
  ) {
    return this.unitsService.searchUnits(storeId, searchTerm);
  }

  @Get('statistics')
  getUnitStatistics(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.unitsService.getUnitStatistics(storeId);
  }

  @Get('active')
  getActiveUnits(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.unitsService.getActiveUnits(storeId);
  }

  @Get('by-name/:name')
  getUnitByName(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('name') name: string,
  ) {
    return this.unitsService.getUnitByName(storeId, name);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id') id: string,
  ) {
    return this.unitsService.toggleActive(storeId, id);
  }

  @Post('bulk')
  bulkCreate(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() units: CreateUnitDto[],
  ) {
    return this.unitsService.bulkCreate(storeId, units);
  }

  @Delete('orphaned/:id')
  async removeOrphanedUnit(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id') id: string,
  ) {
    // Check if unit has dependencies
    const dependencies = await this.unitsService.checkAssociations(storeId, id);
    
    if (dependencies) {
      throw new Error(`Cannot delete unit. It has associated variants.`);
    }
    
    return this.unitsService.delete(storeId, id);
  }

  // --- Debug endpoints (for development) ---

  @Get('debug/index')
  async debugIndex() {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Get('debug/reindex')
  async debugReindex(@Param('storeId', ParseUUIDPipe) storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Get('debug/store-units')
  async debugStoreUnits(@Param('storeId', ParseUUIDPipe) storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
}
