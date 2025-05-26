import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateDamagedItemDto {
  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDate()
  @IsOptional()
  damageDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 