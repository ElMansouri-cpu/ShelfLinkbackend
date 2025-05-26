import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './services/inventory.service';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { Transaction } from './entities/transaction.entity';
import { DamagedItem } from './entities/damaged-item.entity';
import { StockTransfersService } from './services/stock-transfers.service';
import { TransactionsService } from './services/transactions.service';
import { DamagedItemsService } from './services/damaged-items.service';
import { StockTransfersController } from './controllers/stock-transfers.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { DamagedItemsController } from './controllers/damaged-items.controller';
import { StoresModule } from '../stores/stores.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryBatch,
      StockTransfer,
      Transaction,
      DamagedItem,
    ]),
    StoresModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [
    InventoryController,
    StockTransfersController,
    TransactionsController,
    DamagedItemsController,
  ],
  providers: [
    InventoryService,
    StockTransfersService,
    TransactionsService,
    DamagedItemsService,
  ],
  exports: [
    InventoryService,
    StockTransfersService,
    TransactionsService,
    DamagedItemsService,
  ],
})
export class InventoryModule {} 