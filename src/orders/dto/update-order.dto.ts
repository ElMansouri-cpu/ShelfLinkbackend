import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';
import { Status } from '../entities/order.entity';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  netAmount?: number;

  @IsString()
  @IsOptional()
  status?: Status;

  @IsDate()
  @IsOptional()
  orderDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 