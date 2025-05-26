import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateDamagedItemDto {
  @IsString()
  variantId: string;

  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  @IsNumber()
  quantity: number;

  @IsString()
  reason: string;

  @IsDate()
  @IsOptional()
  damageDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 