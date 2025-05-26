import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    StoresModule,
    SupabaseModule,
    UsersModule
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {} 