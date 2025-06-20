import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { Provider } from './entities/provider.entity';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { ProviderSearchService } from './services/provider-search.service';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider]),
    SupabaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SearchModule)
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderSearchService],
  exports: [ProvidersService, ProviderSearchService],
})
export class ProvidersModule {} 