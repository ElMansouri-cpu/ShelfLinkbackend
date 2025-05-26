import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateTransactionDto {
  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  type?: string; // IN, OUT, ADJUSTMENT

  @IsNumber()
  @IsOptional()
  quantity?: number;

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