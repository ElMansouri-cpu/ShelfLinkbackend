import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand]),
    StoresModule,
    SupabaseModule,
    UsersModule
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {} 