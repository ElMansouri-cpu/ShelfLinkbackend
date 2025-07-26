import { Module, forwardRef, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { UnitsService } from './unit.service';
import { UnitController } from './unit.controller';
import { Unit } from './entities/unit.entity';
import { UnitSearchService } from './services/unit-search.service';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unit]),
    ElasticsearchModule,
    StoresModule,
    SupabaseModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [UnitController],
  providers: [UnitsService, UnitSearchService, Logger],
  exports: [UnitsService, UnitSearchService],
})
export class UnitModule {}
