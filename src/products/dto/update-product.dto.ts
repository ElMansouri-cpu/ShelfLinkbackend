import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 