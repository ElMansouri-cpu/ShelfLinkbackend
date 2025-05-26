import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateOrderPaymentDto {
  @IsString()
  orderId: string;

  @IsString()
  paymentMethod: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @IsOptional()
  paymentDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 