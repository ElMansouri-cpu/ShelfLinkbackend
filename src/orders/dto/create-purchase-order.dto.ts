import { IsNumber, IsString, IsOptional, IsDate } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsNumber()
  providerId: number;

  @IsDate()
  @IsOptional()
  orderDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  remarks?: string;
} 