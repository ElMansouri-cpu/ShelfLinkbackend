import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Put } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@Controller('stores')
@UseGuards(SupabaseAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  create(@Body() createStoreDto: CreateStoreDto, @User() user) {
    return this.storesService.create(createStoreDto, user.id);
  }

  @Get()
  findAll(@User() user) {
    return this.storesService.findAll(user.id);
  }

  @Get('all')
  getAllStores() {
    return this.storesService.getAllStores();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.findOne(id, user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @User() user,
  ) {
    return this.storesService.update(id, updateStoreDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.remove(id, user.id);
  }

  @Patch(':id/set-primary')
  setPrimary(@Param('id', ParseUUIDPipe) id: string, @User() user) {
    return this.storesService.setPrimary(id, user.id);
  }
} 