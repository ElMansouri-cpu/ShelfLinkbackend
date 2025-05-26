import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { StockTransfersService } from '../services/stock-transfers.service';
import { StockTransfer } from '../entities/stock-transfer.entity';
import { CreateStockTransferDto } from '../dto/create-stock-transfer.dto';
import { UpdateStockTransferDto } from '../dto/update-stock-transfer.dto';

@Controller('stores/:storeId/inventory/transfers')
export class StockTransfersController extends StoreCrudController<StockTransfer, CreateStockTransferDto, UpdateStockTransferDto> {
  constructor(protected readonly service: StockTransfersService) {
    super(service);
  }
} 