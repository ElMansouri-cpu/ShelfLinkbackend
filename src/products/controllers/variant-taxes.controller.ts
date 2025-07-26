import { Controller, Post, Body, Param, Headers, UseGuards, Get, Query, ParseUUIDPipe, Put, Delete } from '@nestjs/common';
import { VariantTaxesService } from '../services/variant-taxes.service';
import { Tax } from '../entities/tax.entity';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { QueryDto } from '../../common/dto/query.dto';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { User } from '../../auth/decorators/user.decorator';

@Controller('stores/:storeId/taxes')
@UseGuards(SupabaseAuthGuard)
export class VariantTaxesController {
  constructor(
    private readonly service: VariantTaxesService,
  ) {}

  // --- Basic CRUD endpoints ---

  @Post()
  async create(
    @Param('storeId') storeId: string,
    @Body() createTaxDto: CreateTaxDto,
  ) {
    return this.service.create(storeId, createTaxDto);
  }

  @Get()
  async findAll(
    @Param('storeId') storeId: string,
    @Query() query: any,
  ) {
    return this.service.findAll(storeId, query);
  }

  @Get(':id')
  async findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(storeId, id);
  }

  @Put(':id')
  async update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
  ) {
    return this.service.update(storeId, id, updateTaxDto);
  }

  @Delete(':id')
  async remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(storeId, id);
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

  @Post('query')
  async queryTaxes(
    @Param('storeId') storeId: string,
    @Body() queryDto: QueryDto,
  ) {
    return this.service.query(storeId, queryDto, storeId);
  }

  @Get('search')
  async searchTaxes(
    @Param('storeId') storeId: string,
    @Query('q') searchTerm: string,
    @Query('limit') limit: number = 20,
  ) {
    return this.service.searchTaxes(storeId, searchTerm, limit);
  }

  @Get('active')
  async getActiveTaxes(@Param('storeId') storeId: string) {
    return this.service.getActiveTaxes(storeId);
  }

  @Get('statistics')
  async getTaxStatistics(@Param('storeId') storeId: string) {
    return this.service.getTaxStatistics(storeId);
  }

  @Get('by-name/:name')
  async findByName(
    @Param('storeId') storeId: string,
    @Param('name') name: string,
  ) {
    return this.service.findByName(storeId, name);
  }

  @Post(':id/toggle-active')
  async toggleActive(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.toggleActive(storeId, id);
  }

  @Post('reindex')
  async reindexStore(@Param('storeId') storeId: string) {
    // Elasticsearch is disabled, return success message
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Delete('orphaned/:id')
  async removeOrphanedTax(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    // Check if tax has dependencies
    const dependencies = await this.service.checkAssociations(storeId, id);
    
    if (dependencies) {
      throw new Error(`Cannot delete tax. It is used by variants.`);
    }
    
    return this.service.delete(storeId, id);
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

  @Get('debug/store-taxes')
  async debugStoreTaxes(@Param('storeId') storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
} 