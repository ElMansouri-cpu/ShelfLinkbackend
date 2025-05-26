import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateVariantPromotionDto {
  @IsString()
  name: string;

  @IsNumber()
  discountPercentage: number;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 