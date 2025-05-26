import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrderPaymentDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

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