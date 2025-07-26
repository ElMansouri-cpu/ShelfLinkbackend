import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Query, 
  Body, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBody 
} from '@nestjs/swagger';
import { VariantService } from '../services/variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';

@ApiTags('variants')
@Controller('store/:storeId/variant')
export class VariantController {
  constructor(
    private readonly variantService: VariantService,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new variant' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiBody({ type: CreateVariantDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Variant created successfully',
    type: Variant 
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Param('storeId') storeId: string,
    @Body() createVariantDto: CreateVariantDto
  ): Promise<Variant> {
    return this.variantService.create(storeId, createVariantDto);
  }

  @Get('fetch')
  @ApiOperation({ summary: 'Fetch or search variants' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Variants retrieved successfully',
    type: [Variant] 
  })
  async fetch(
    @Param('storeId') storeId: string,
    @Query() query: any
  ): Promise<Variant[]> {
    return this.variantService.findAll(storeId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a variant by ID' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiParam({ name: 'id', description: 'Variant ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Variant retrieved successfully',
    type: Variant 
  })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string
  ): Promise<Variant> {
    return this.variantService.findOne(storeId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a variant' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiParam({ name: 'id', description: 'Variant ID' })
  @ApiBody({ type: UpdateVariantDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Variant updated successfully',
    type: Variant 
  })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto
  ): Promise<Variant> {
    return this.variantService.update(storeId, id, updateVariantDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a variant' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiParam({ name: 'id', description: 'Variant ID' })
  @ApiResponse({ status: 204, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async delete(
    @Param('storeId') storeId: string,
    @Param('id') id: string
  ): Promise<void> {
    return this.variantService.delete(storeId, id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search variants with filters' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results',
    type: [Variant] 
  })
  async search(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query() rawFilters: Record<string, string | string[]>
  ) {
    // Elasticsearch is disabled, return empty results
    return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Find variant by SKU' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiParam({ name: 'sku', description: 'Variant SKU' })
  @ApiResponse({ 
    status: 200, 
    description: 'Variant found by SKU',
    type: Variant 
  })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async findBySku(
    @Param('storeId') storeId: string,
    @Param('sku') sku: string
  ): Promise<Variant | null> {
    return this.variantService.findBySku(sku, storeId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find variant by barcode' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  @ApiParam({ name: 'barcode', description: 'Variant barcode' })
  @ApiResponse({ 
    status: 200, 
    description: 'Variant found by barcode',
    type: Variant 
  })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async findByBarcode(
    @Param('storeId') storeId: string,
    @Param('barcode') barcode: string
  ): Promise<Variant | null> {
    return this.variantService.findByBarcode(barcode, storeId);
  }

  @Get('debug/indexed-data')
  @ApiOperation({ summary: 'Debug indexed data' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  async debugIndexedData(@Param('storeId') storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
} 