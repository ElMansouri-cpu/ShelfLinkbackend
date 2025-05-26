import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
} 