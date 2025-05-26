import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  banner?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsEnum(['active', 'maintenance'])
  @IsOptional()
  status?: 'active' | 'maintenance';
} 