import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateReturnOrderItemDto {
  @IsString()
  variantId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  totalAmount: number;

  @IsString()
  @IsOptional()
  returnReason?: string;
} 