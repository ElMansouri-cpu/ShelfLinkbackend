import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, ParseIntPipe, Query } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { QueryDto } from 'src/common/dto/query.dto';
import { Brand } from './entities/brand.entity';
import { Cacheable } from '../cache/decorators';

@Controller('stores/:storeId/brands')
@UseGuards(SupabaseAuthGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

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

      return `search:brands:${keyParts.join(':')}`;
    }
  })
  async elasticSearch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: any,
    @User() user,
  ) {
    const { q, ...cleanFilters } = filters;
    return this.brandsService.elasticSearch(storeId, query, cleanFilters, user.id);
  }

  @Post('elasticsearch/reindex')
  async reindexStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    // Verify store ownership
    await this.brandsService.storesService.findOne(storeId, user.id);
    
    await this.brandsService.searchService.reindexByStore(storeId);
    return { message: 'Brands reindexing completed' };
  }

  @Post()
  create(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() createBrandDto: CreateBrandDto,
    @User() user,
  ) {
    if (createBrandDto.storeId !== storeId) {
      createBrandDto.storeId = storeId;
    }
    return this.brandsService.create(createBrandDto, user.id);
  }

  @Get()
  findAll(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @User() user,
  ) {
    return this.brandsService.findAll(storeId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    return this.brandsService.findOne(id, storeId, user.id);
  }

  @Patch(':id')
  update(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBrandDto: UpdateBrandDto,
    @User() user,
  ) {
    if (updateBrandDto.storeId && updateBrandDto.storeId !== storeId) {
      updateBrandDto.storeId = storeId;
    }
    return this.brandsService.update(id, updateBrandDto, storeId, user.id);
  }

  @Delete(':id')
  remove(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', ParseIntPipe) id: number,
    @User() user,
  ) {
    return this.brandsService.remove(id, storeId, user.id);
  }

  @Post('filterquery')
  queryItems(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() queryDto: QueryDto,
    @User() user,
  ) {
    return this.brandsService.queryBrands(storeId, queryDto, user.id);
  }
} 