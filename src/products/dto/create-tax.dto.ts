import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateTaxDto {
  @IsString()
  name: string;

  @IsNumber()
  rate: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 