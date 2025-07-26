import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { User } from '../users/entities/user.entity';
import { StoreSearchService } from './services/store-search.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, User]),
    ElasticsearchModule,
    SupabaseModule,
    forwardRef(() => UsersModule)
  ],
  controllers: [StoresController],
  providers: [StoresService, StoreSearchService, Logger],
  exports: [StoresService, StoreSearchService],
})
export class StoresModule {} 