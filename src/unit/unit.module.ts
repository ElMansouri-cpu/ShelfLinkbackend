import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './unit.service';
import { UnitController } from './unit.controller';
import { Unit } from './entities/unit.entity';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { UnitSearchService } from './services/unit-search.service';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unit]),
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SearchModule)
  ],
  controllers: [UnitController],
  providers: [UnitsService, UnitSearchService],
  exports: [UnitsService, UnitSearchService],
})
export class UnitModule {}
