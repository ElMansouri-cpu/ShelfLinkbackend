import { IsString, IsNumber, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';

export class UpdateVariantDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsString()
  barcode: string;

  @IsNumber()
  price: number;

  @IsNumber()
  cost: number;

  @IsString()
  description: string;

  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  image: string | null;

  @IsEnum(['percentage', 'currency'])
  marginType: 'percentage' | 'currency';

  @IsNumber()
  buyPriceHt: number;

  @IsNumber()
  buyDiscountPct: number;

  @IsNumber()
  buyPriceNetHt: number;

  @IsOptional()
  @IsNumber()
  buyPriceTtc: number | null;

  @IsNumber()
  margePct: number;

  @IsNumber()
  sellPriceHt: number;

  @IsOptional()
  @IsNumber()
  sellPriceTtc: number | null;

  @IsUUID()
  providerId: string;

  @IsUUID()
  storeId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  taxes: string[];
} 