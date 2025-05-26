import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  variantId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  totalAmount: number;
} 