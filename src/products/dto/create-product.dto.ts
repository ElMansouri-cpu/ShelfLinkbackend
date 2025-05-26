import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

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

  @IsString()
  @IsOptional()
  image?: string;

  @IsUUID()
  brandId: string;

  @IsUUID()
  categoryId: string;
} 