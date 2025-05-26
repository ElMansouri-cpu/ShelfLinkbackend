import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [SupabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthGuard]
})
export class AuthModule {}
