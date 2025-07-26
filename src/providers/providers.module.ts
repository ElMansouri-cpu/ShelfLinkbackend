import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { Provider } from './entities/provider.entity';
import { ProviderSearchService } from './services/provider-search.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider]),
    ElasticsearchModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
    AppCacheModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderSearchService, Logger],
  exports: [ProvidersService, ProviderSearchService],
})
export class ProvidersModule {} 