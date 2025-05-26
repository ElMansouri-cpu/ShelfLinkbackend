import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateVariantPromotionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  discountPercentage?: number;

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