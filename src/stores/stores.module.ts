import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { User } from '../users/entities/user.entity';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, User]),
    SupabaseModule,
    UsersModule
  ],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {} 