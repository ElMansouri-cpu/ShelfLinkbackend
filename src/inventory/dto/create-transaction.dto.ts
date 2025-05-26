import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  variantId: string;

  @IsString()
  type: string; // IN, OUT, ADJUSTMENT

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @IsOptional()
  transactionDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 