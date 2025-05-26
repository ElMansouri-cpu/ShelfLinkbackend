import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { TransactionsService } from '../services/transactions.service';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';

@Controller('stores/:storeId/inventory/transactions')
export class TransactionsController extends StoreCrudController<Transaction, CreateTransactionDto, UpdateTransactionDto> {
  constructor(protected readonly service: TransactionsService) {
    super(service);
  }
} 