import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { CategorySearchService } from './services/category-search.service';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SearchModule)
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategorySearchService],
  exports: [CategoriesService, CategorySearchService],
})
export class CategoriesModule {} 