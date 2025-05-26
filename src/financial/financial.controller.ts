import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../common/controllers/store-crud.controller';
import { FinancialService } from './financial.service';
import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller('stores/:storeId/financial')
export class FinancialController extends StoreCrudController<
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto
> {
  constructor(protected readonly service: FinancialService) {
    super(service);
  }
} 