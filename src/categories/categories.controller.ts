// import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, ParseIntPipe, Query, Req } from '@nestjs/common';
// import { CategoriesService } from './categories.service';
// import { CreateCategoryDto } from './dto/create-category.dto';
// import { UpdateCategoryDto } from './dto/update-category.dto';
// import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
// import { User } from '../auth/decorators/user.decorator';
// import { QueryDto } from 'src/common/dto/query.dto';
// import { Category } from './entities/category.entity';

// @Controller('stores/:storeId/categories')
// @UseGuards(SupabaseAuthGuard)
// export class CategoriesController {
//   constructor(private readonly categoriesService: CategoriesService) {}
//   @Get('search')
//   textSearch(
//     @Param('storeId') storeId: string,
//     @Query('q') q: string,
//     @User() user,

//     @Req() req: Request, // assuming userId is stored in request
//   ): Promise<Category[]> {
//     const userId = user.id;
//     return this.categoriesService.textSearchCategories(storeId, q, userId);
//   }
//   @Post()
//   create(
//     @Param('storeId', new ParseUUIDPipe()) storeId: string,
//     @Body() createCategoryDto: CreateCategoryDto,
//     @User() user,
//   ) {
//     if (createCategoryDto.storeId !== storeId) {
//       createCategoryDto.storeId = storeId;
//     }
//     return this.categoriesService.create(createCategoryDto, user.id);
//   }

//   @Get()
//   findAll(
//     @Param('storeId', new ParseUUIDPipe()) storeId: string,
//     @User() user,
//   ) {
//     return this.categoriesService.findAll(storeId, user.id);
//   }

//   @Get(':id')
//   findOne(
//     @Param('storeId', new ParseUUIDPipe()) storeId: string,
//     @Param('id', ParseIntPipe) id: number,
//     @User() user,
//   ) {
//     return this.categoriesService.findOne(id, storeId, user.id);
//   }

//   @Patch(':id')
//   update(
//     @Param('storeId', new ParseUUIDPipe()) storeId: string,
//     @Param('id', ParseIntPipe) id: number,
//     @Body() updateCategoryDto: UpdateCategoryDto,
//     @User() user,
//   ) {
//     if (updateCategoryDto.storeId && updateCategoryDto.storeId !== storeId) {
//       updateCategoryDto.storeId = storeId;
//     }
//     return this.categoriesService.update(id, updateCategoryDto, storeId, user.id);
//   }

//   @Delete(':id')
//   remove(
//     @Param('storeId', new ParseUUIDPipe()) storeId: string,
//     @Param('id', ParseIntPipe) id: number,
//     @User() user,
//   ) {
//     return this.categoriesService.remove(id, storeId, user.id);
//   }

//   @Post('filterquery')
//   queryItems(@Body() queryDto: QueryDto) {
//     return this.categoriesService.queryCategories(queryDto);
//   }


  
// } 


// src/categories/categories.controller.ts
import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { StoreCrudController } from 'src/common/controllers/store-crud.controller';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { CategorySearchService } from './services/category-search.service';
import { Cacheable } from '../cache/decorators';

@Controller('stores/:storeId/categories')
@UseGuards(SupabaseAuthGuard)
export class CategoriesController extends StoreCrudController<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(
    protected readonly service: CategoriesService,
    private readonly categorySearchService: CategorySearchService
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

      return `search:categories:${keyParts.join(':')}`;
    }
  })
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
    @User() user,
  ) {
    const { q, ...cleanFilters } = filters;
    return this.categorySearchService.searchEntities(query, { ...cleanFilters, storeId });
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

      return `search:categories:${keyParts.join(':')}`;
    }
  })
  async fetch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query() filters: Record<string, string>
  ) {
    return this.categorySearchService.searchEntities(q, { ...filters, storeId });
  }

  @Get(':id/products')
  getProducts(@Param('id') id: string) {
    return this.service.getProducts(id);
  }

  @Get('debug/index')
  async debugIndex() {
    return this.categorySearchService.debugIndex();
  }

  @Get('debug/reindex')
  async debugReindex(@Param('storeId') storeId: string) {
    await this.categorySearchService.reindexByStore(storeId);
    return { message: 'Reindex completed' };
  }

  @Get('debug/store/:storeId')
  async debugStoreCategories(@Param('storeId') storeId: string) {
    await this.categorySearchService.debugCategoriesByStore(storeId);
    return { message: 'Debug completed, check server logs' };
  }

  @Get('debug/reindex-store/:storeId')
  async reindexStore(@Param('storeId') storeId: string) {
    await this.service.reindexStore(storeId);
    return { message: `Reindexed categories for store ${storeId}` };
  }

  @Get('debug/search-index/:storeId')
  async debugSearchIndex(@Param('storeId') storeId: string) {
    await this.service.debugSearchIndex(storeId);
    return { message: 'Search index debug completed, check server logs' };
  }

  @Get('debug/parentid/:storeId')
  async debugParentId(@Param('storeId') storeId: string) {
    await this.categorySearchService.debugParentIdIndexing(storeId);
    return { message: 'ParentId debug completed, check server logs' };
  }

  @Get('debug/count')
  async getCounts(@Param('storeId') storeId: string) {
    try {
      // Get database count using service method
      const categories = await this.service.findByStore(storeId);
      const dbCount = categories.length;
      
      // Get Elasticsearch count using search service
      let esCount = 0;
      try {
        const searchResult = await this.categorySearchService.searchEntities('', { storeId, limit: 1 });
        esCount = searchResult.pagination.total;
      } catch (error) {
        console.error('Failed to get ES count:', error);
      }
      
      return {
        database: dbCount,
        elasticsearch: esCount,
        synced: dbCount === esCount,
        difference: dbCount - esCount
      };
    } catch (error) {
      console.error('Failed to get counts:', error);
      throw error;
    }
  }
  

  // …you still can add or override any extra endpoints here.
}
