
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, ParseIntPipe, Query, Put } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { Category } from './entities/category.entity';
import { QueryDto } from '../common/dto/query.dto';

@Controller('stores/:storeId/categories')
@UseGuards(SupabaseAuthGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  // --- Basic CRUD endpoints ---

  @Post()
  create(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() createCategoryDto: CreateCategoryDto,
    @User() user,
  ) {
    if (createCategoryDto.storeId !== storeId) {
      createCategoryDto.storeId = storeId;
    }
    return this.categoriesService.create(storeId, createCategoryDto);
  }

  @Get()
  findAll(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query() query: any,
    @User() user,
  ) {
    return this.categoriesService.findAll(storeId, query);
  }

  @Get(':id')
  findOne(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id') id: string,
    @User() user,
  ) {
    return this.categoriesService.findOne(storeId, id);
  }

  @Patch(':id')
  update(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @User() user,
  ) {
    return this.categoriesService.update(storeId, id, updateCategoryDto);
  }

  @Delete(':id')
  remove(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id') id: string,
    @User() user,
  ) {
    return this.categoriesService.delete(storeId, id);
  }

  // --- Entity-specific endpoints ---

  @Get('elasticsearch')
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
    @User() user,
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
  queryItems(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() queryDto: QueryDto,
    @User() user,
  ) {
    return this.categoriesService.query(storeId, queryDto, user.id);
  }

  @Get('root')
  getRootCategories(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.categoriesService.getRootCategories(storeId);
  }

  @Get('tree')
  getCategoryTree(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.categoriesService.getCategoryTree(storeId);
  }

  @Get('parent/:parentId')
  getCategoriesByParent(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('parentId', ParseIntPipe) parentId: number,
    @User() user,
  ) {
    return this.categoriesService.getCategoriesByParent(parentId, storeId);
  }

  @Get('popular')
  getPopularCategories(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('limit') limit: number = 10,
    @User() user,
  ) {
    return this.categoriesService.getPopularCategories(storeId, limit);
  }

  @Get('statistics')
  getCategoryStatistics(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.categoriesService.getCategoryStatistics(storeId);
  }

  @Get('breadcrumb/:id')
  getCategoryBreadcrumb(
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    return this.categoriesService.getCategoryBreadcrumb(id);
  }

  @Get('with-products')
  getCategoriesWithProducts(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.categoriesService.getCategoriesWithProducts(storeId);
  }

  @Get('search')
  searchCategories(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') searchTerm: string,
    @User() user,
  ) {
    return this.categoriesService.searchCategories(storeId, searchTerm);
  }

  @Delete('orphaned/:id')
  async removeOrphanedCategory(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    // Check if category has dependencies
    const dependencies = await this.categoriesService.checkAssociations(storeId, id.toString());
    
    if (dependencies) {
      throw new Error(`Cannot delete category. It has associated variants or subcategories.`);
    }
    
    return this.categoriesService.delete(storeId, id.toString());
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

  @Get('debug/search')
  async debugSearchIndex(@Param('storeId') storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Get('debug/parent-id')
  async debugParentId(@Param('storeId') storeId: string) {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
}
