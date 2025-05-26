import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryBatchDto } from './create-inventory-batch.dto';

export class UpdateInventoryBatchDto extends PartialType(CreateInventoryBatchDto) {} 