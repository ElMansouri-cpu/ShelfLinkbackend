import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateStockTransferDto {
  @IsString()
  @IsOptional()
  destinationStoreId?: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsDate()
  @IsOptional()
  transferDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 