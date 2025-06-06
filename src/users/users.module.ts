import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { OnboardingController } from './onboarding.controller';
import { User } from './entities/user.entity';
import { UserSearchService } from './services/user-search.service';
import { SearchModule } from '../elasticsearch/elasticsearch.module';
import { StoresModule } from '../stores/stores.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    SupabaseModule,
    forwardRef(() => SearchModule),
    forwardRef(() => StoresModule),
    forwardRef(() => CategoriesModule),
  ],
  controllers: [UsersController, OnboardingController],
  providers: [UsersService, UserSearchService],
  exports: [UsersService, UserSearchService]
})
export class UsersModule {}
