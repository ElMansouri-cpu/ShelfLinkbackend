import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateReturnOrderItemDto {
  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  returnReason?: string;
} 