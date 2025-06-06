import {
  Controller, UseGuards, Get, Post,
  Param, Body, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { SearchableStoreCrudService } from '../services/searchable-store-crud.service';
import { SupabaseAuthGuard } from 'src/auth/guards/supabase-auth.guard';
import { User as UserDec } from 'src/auth/decorators/user.decorator';
import { StoreCrudController } from './store-crud.controller';
import { QueryDto } from '../dto/query.dto';
import { ObjectLiteral } from 'typeorm';
import { SearchableEntity, SearchFilters } from '../services/base-search.service';

@UseGuards(SupabaseAuthGuard)
export abstract class SearchableStoreCrudController<
  T extends SearchableEntity,
  CreateDto,
  UpdateDto
> extends StoreCrudController<T, CreateDto, UpdateDto> {
  constructor(protected readonly service: SearchableStoreCrudService<T>) {
    super(service);
  }

  @Get('elasticsearch')
  async elasticSearch(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') query: string = '',
    @Query() filters: SearchFilters,
    @UserDec() user: any,
  ) {
    const { q, ...cleanFilters } = filters;
    return this.service.elasticSearch(storeId, query, cleanFilters, user.id);
  }

  @Post('elasticsearch/reindex')
  async reindexStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @UserDec() user: any,
  ) {
    // Verify store ownership
    await this.service.verifyStoreAccess(storeId, user.id);
    await this.service.reindexStore(storeId);
    return { message: 'Reindexing completed' };
  }
} 