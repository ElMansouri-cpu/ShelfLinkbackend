import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { DamagedItemsService } from '../services/damaged-items.service';
import { DamagedItem } from '../entities/damaged-item.entity';
import { CreateDamagedItemDto } from '../dto/create-damaged-item.dto';
import { UpdateDamagedItemDto } from '../dto/update-damaged-item.dto';

@Controller('stores/:storeId/inventory/damaged-items')
export class DamagedItemsController extends StoreCrudController<DamagedItem, CreateDamagedItemDto, UpdateDamagedItemDto> {
  constructor(protected readonly service: DamagedItemsService) {
    super(service);
  }
} 