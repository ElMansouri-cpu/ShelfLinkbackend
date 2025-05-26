import { IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateVariantPriceDto {
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsDate()
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 