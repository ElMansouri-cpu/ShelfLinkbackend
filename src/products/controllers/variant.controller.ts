import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantService } from '../services/variant.service';
import { Variant } from '../entities/variant.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { VariantSearchService } from '../services/variant-search.service';
import { Cacheable } from '../../cache/decorators';

@Controller('stores/:storeId/variants')
export class VariantController extends StoreCrudController<Variant, CreateVariantDto, UpdateVariantDto> {
  constructor(protected readonly service: VariantService, private readonly variantSearchService: VariantSearchService) {
    super(service);
  }
  
  @Get('fetch')
  @Cacheable({
    ttl: 300,
    keyGenerator: (request: any) => {
      const storeId = request.params.storeId;
      const query = request.query;
      
      // Build a unique key based on all query parameters
      const keyParts = [
        `store=${storeId}`,
        `q=${query.q || ''}`,
        `page=${query.page || '1'}`,
        `limit=${query.limit || '20'}`
      ];

      // Add any additional filters
      const filters = Object.entries(query)
        .filter(([key]) => !['q', 'page', 'limit'].includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`);

      if (filters.length > 0) {
        keyParts.push(`filters=${filters.join('|')}`);
      }

      return `search:variants:${keyParts.join(':')}`;
    }
  })
  async elasticsearch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query() rawFilters: Record<string, string | string[]>
  ) {
    const { q: _, page: __, limit: ___, ...filters } = rawFilters;
    
    // Convert string arrays to proper format for Elasticsearch and decode URL encoding
    const processedFilters: Record<string, any> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        processedFilters[key] = value.map(v => decodeURIComponent(v));
      } else {
        processedFilters[key] = decodeURIComponent(value);
      }
    });
    
    console.log('Original filters:', filters);
    console.log('Processed filters:', processedFilters);
  
    return this.variantSearchService.searchVariants(q, {
      ...processedFilters,
      page: Number(page),
      limit: Number(limit),
      storeId: storeId,
    });
  }
  
  @Get('fetch/refresh')
  async refreshAndFetch(
    @Param('storeId') storeId: string,
    @Query('q') q: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query() rawFilters: Record<string, string | string[]>
  ) {
    // Force refresh the index
    await this.variantSearchService.refreshIndex();
    
    const { q: _, page: __, limit: ___, ...filters } = rawFilters;
    
    // Convert string arrays to proper format for Elasticsearch and decode URL encoding
    const processedFilters: Record<string, any> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        processedFilters[key] = value.map(v => decodeURIComponent(v));
      } else {
        processedFilters[key] = decodeURIComponent(value);
      }
    });
  
    return this.variantSearchService.searchVariants(q, {
      ...processedFilters,
      page: Number(page),
      limit: Number(limit),
      storeId: storeId,
    });
  }

  @Get('debug/indexed')
  async debugIndexedData(@Param('storeId') storeId: string) {
    return this.variantSearchService.debugIndexedData(storeId);
  }
} 