import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrderItemDto {
  @IsString()
  @IsOptional()
  orderId?: string;

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 