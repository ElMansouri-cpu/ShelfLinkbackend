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

  @Get('search')
  searchItems(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') search: string,
    @User() user,
  ): Promise<Category[]> {
    return this.service.searchCategories(storeId, search);
  }

  @Get('elasticsearch')
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
    ttl: 300, // 5 minutes for search results
    keyGenerator: (storeId, q = '', filters = {}) => {
      const { page = 1, limit = 50, ...cleanFilters } = filters;
      const filtersKey = Object.keys(cleanFilters).length > 0 ? JSON.stringify(cleanFilters) : 'no-filters';
      return `search:categories:${q || 'all'}:page:${page}:limit:${limit}:filters:${filtersKey}:store:${storeId}`;
    },
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
  

  // …you still can add or override any extra endpoints here.
}
