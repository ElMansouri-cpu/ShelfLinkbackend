import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateStockTransferDto {
  @IsString()
  destinationStoreId: string;

  @IsString()
  variantId: string;

  @IsNumber()
  quantity: number;

  @IsDate()
  @IsOptional()
  transferDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 