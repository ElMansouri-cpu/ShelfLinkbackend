import { Controller } from '@nestjs/common';
import { StoreCrudController } from 'src/common/controllers/store-crud.controller';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './unit.service';

@Controller('stores/:storeId/units')
export class UnitController extends StoreCrudController<Unit, CreateUnitDto, UpdateUnitDto> {
  constructor(private readonly unitsService: UnitsService) {
    super(unitsService);
  }
}
