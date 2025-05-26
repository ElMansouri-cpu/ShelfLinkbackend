import { IsString, IsOptional, IsNumber, IsDate } from 'class-validator';

export class CreateInventoryBatchDto {
  @IsNumber()
  variantId: number;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsDate()
  @IsOptional()
  expirationDate?: Date;

  @IsNumber()
  quantityTotal: number;

  @IsNumber()
  @IsOptional()
  quantityReserved?: number;
} 