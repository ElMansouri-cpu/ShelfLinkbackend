import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateTaxDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  rate?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 