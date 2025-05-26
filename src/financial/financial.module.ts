import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { Expense } from './entities/expense.entity';
import { PaymentVoucher } from './entities/payment-voucher.entity';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Expense,
      PaymentVoucher,
    ]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {} 