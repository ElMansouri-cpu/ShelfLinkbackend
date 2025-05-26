import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateReturnOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  returnReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @IsOptional()
  returnDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 