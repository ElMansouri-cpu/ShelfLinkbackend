// src/common/controllers/base-crud.controller.ts
import {
    Post, Get, Patch, Delete,
    Body, Param, ParseIntPipe, Query,
  } from '@nestjs/common';
  import { BaseCrudService } from 'src/common/services/base-crud.service';
  import { ObjectLiteral } from 'typeorm';
  
  export abstract class BaseCrudController<
    T extends ObjectLiteral,
    CreateDto,
    UpdateDto
  > {
    constructor(protected readonly service: BaseCrudService<T>) {}
  
    @Post()
    create(@Body() dto: CreateDto, @Param('storeId') storeId: string) {
      return this.service.create({ ...dto, storeId } as any);
    }
  
    @Get()
    findAll(@Query() q: any, @Param('storeId') storeId: string) {
      return this.service.findAll({ ...q, storeId } as any);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string, @Param('storeId') storeId: string) {
      // Only try to parse as number if it's a numeric string
      if (/^\d+$/.test(id)) {
        return this.service.findOne(parseInt(id, 10), { storeId } as any);
      }
      // Otherwise, treat it as a path and let the service handle it
      return this.service.findOne(id, { storeId } as any);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() dto: UpdateDto,
      @Param('storeId') storeId: string,
    ) {
      if (/^\d+$/.test(id)) {
        return this.service.update(parseInt(id, 10), { ...dto, storeId } as any);
      }
      return this.service.update(id, { ...dto, storeId } as any);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string, @Param('storeId') storeId: string) {
      if (/^\d+$/.test(id)) {
        return this.service.remove(parseInt(id, 10), { storeId } as any);
      }
      return this.service.remove(id, { storeId } as any);
    }
  }
  