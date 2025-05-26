import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateOrderReturnDto {
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  returnReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  refundAmount?: number;

  @IsDate()
  @IsOptional()
  returnDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 