import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from '../swagger/swagger-dtos';
import { QueryDto } from '../common/dto/query.dto';

@ApiTags('Brands')
@ApiBearerAuth('JWT-auth')
@Controller('stores/:storeId/brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new brand',
    description: 'Creates a new brand for the specified store. The brand will be available for use in product management.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Brand created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
        name: { type: 'string', example: 'Nike' },
        description: { type: 'string', example: 'Just Do It - Leading sports brand' },
        logo: { type: 'string', example: 'https://example.com/nike-logo.png' },
        website: { type: 'string', example: 'https://www.nike.com' },
        isActive: { type: 'boolean', example: true },
        storeId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
        updatedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @Param('storeId') storeId: string,
    @Body() createBrandDto: CreateBrandDto,
  ) {
    return this.service.create(storeId, createBrandDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all brands',
    description: 'Retrieves all brands for the specified store with optional filtering and pagination.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiQuery({
    name: 'isActive',
    description: 'Filter by active status',
    required: false,
    type: 'boolean',
  })
  @ApiQuery({
    name: 'search',
    description: 'Search brands by name',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Brands retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
          name: { type: 'string', example: 'Nike' },
          description: { type: 'string', example: 'Just Do It - Leading sports brand' },
          logo: { type: 'string', example: 'https://example.com/nike-logo.png' },
          website: { type: 'string', example: 'https://www.nike.com' },
          isActive: { type: 'boolean', example: true },
          storeId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
          createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
          updatedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Param('storeId') storeId: string,
    @Query() query: any,
  ) {
    return this.service.findAll(storeId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a brand by ID',
    description: 'Retrieves a specific brand by its ID within the store context.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the brand',
    example: '550e8400-e29b-41d4-a716-446655440001',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
        name: { type: 'string', example: 'Nike' },
        description: { type: 'string', example: 'Just Do It - Leading sports brand' },
        logo: { type: 'string', example: 'https://example.com/nike-logo.png' },
        website: { type: 'string', example: 'https://www.nike.com' },
        isActive: { type: 'boolean', example: true },
        storeId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
        updatedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Brand not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(storeId, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a brand',
    description: 'Updates an existing brand with the provided data.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the brand to update',
    example: '550e8400-e29b-41d4-a716-446655440001',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
        name: { type: 'string', example: 'Nike Updated' },
        description: { type: 'string', example: 'Updated description' },
        logo: { type: 'string', example: 'https://example.com/nike-logo-updated.png' },
        website: { type: 'string', example: 'https://www.nike.com' },
        isActive: { type: 'boolean', example: true },
        storeId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
        updatedAt: { type: 'string', example: '2024-01-15T11:30:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Brand not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.service.update(storeId, id, updateBrandDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a brand',
    description: 'Deletes a brand. This operation will fail if the brand is associated with any products.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the brand to delete',
    example: '550e8400-e29b-41d4-a716-446655440001',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Brand not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Brand has associations and cannot be deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(storeId, id);
  }

  // --- Entity-specific endpoints ---

  @Post('query')
  @ApiOperation({
    summary: 'Query brands with advanced filters',
    description: 'Performs advanced queries on brands with filtering, sorting, and pagination.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Query results retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async queryBrands(
    @Param('storeId') storeId: string,
    @Body() queryDto: QueryDto,
  ) {
    return this.service.query(storeId, queryDto, storeId);
  }

  @Get('popular')
  @ApiOperation({
    summary: 'Get popular brands',
    description: 'Retrieves the most popular brands based on product count.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of brands to return',
    example: 10,
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular brands retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getPopularBrands(
    @Param('storeId') storeId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.service.getPopularBrands(storeId, limit);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get brand statistics',
    description: 'Retrieves statistics about brands in the store.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getBrandStatistics(@Param('storeId') storeId: string) {
    return this.service.getBrandStatistics(storeId);
  }
} 