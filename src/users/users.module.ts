import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSearchService } from './services/user-search.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { OnboardingController } from './onboarding.controller';
import { User } from './entities/user.entity';
import { StoresModule } from '../stores/stores.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ElasticsearchModule,
    SupabaseModule,
    forwardRef(() => StoresModule),
    forwardRef(() => CategoriesModule),
  ],
  controllers: [UsersController, OnboardingController],
  providers: [UsersService, UserSearchService, Logger],
  exports: [UsersService, UserSearchService]
})
export class UsersModule {}
