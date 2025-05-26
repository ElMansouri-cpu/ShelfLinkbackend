import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsEnum(['active', 'maintenance'])
  @IsOptional()
  status?: 'active' | 'maintenance';
} 