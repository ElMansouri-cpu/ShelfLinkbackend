// src/common/controllers/store-crud.controller.ts
import {
  Controller, UseGuards, Get, Post,
  Param, Body, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { StoreCrudService } from 'src/common/services/store-crud.service';
import { SupabaseAuthGuard } from 'src/auth/guards/supabase-auth.guard';
import { User as UserDec } from 'src/auth/decorators/user.decorator';
import { BaseCrudController } from './base-crud.controller';
import { QueryDto } from 'src/common/dto/query.dto';
import { ObjectLiteral } from 'typeorm';

@UseGuards(SupabaseAuthGuard)
export abstract class StoreCrudController<
  T extends ObjectLiteral,
  CreateDto,
  UpdateDto
> extends BaseCrudController<T, CreateDto & { storeId: string }, UpdateDto & { storeId?: string }> {
  constructor(protected readonly service: StoreCrudService<T>) {
    super(service);
  }

  @Get('search')
  search(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') q: string,
    @UserDec() user: any,
  ) {
    return this.service.search(storeId, q, user.id);
  }

  @Post('filterquery')
  query(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: QueryDto,
    @UserDec() user: any,
  ) {
    return this.service.query(storeId, dto, user.id);
  }
}
