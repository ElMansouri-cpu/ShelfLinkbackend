import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { Provider } from './entities/provider.entity';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider]),
    SupabaseModule,
    UsersModule
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {} 