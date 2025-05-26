import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateVariantPriceDto {
  @IsNumber()
  price: number;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 