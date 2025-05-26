import { Controller } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { CreateInventoryBatchDto } from '../dto/create-inventory-batch.dto';
import { UpdateInventoryBatchDto } from '../dto/update-inventory-batch.dto';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';

@Controller('stores/:storeId/inventory')
export class InventoryController extends StoreCrudController<
  InventoryBatch,
  CreateInventoryBatchDto,
  UpdateInventoryBatchDto
> {
  constructor(protected readonly service: InventoryService) {
    super(service);
  }
} 