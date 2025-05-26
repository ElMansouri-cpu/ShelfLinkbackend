import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './unit.service';
import { UnitController } from './unit.controller';
import { Unit } from './entities/unit.entity';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unit]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [UnitController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitModule {}
