import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsUrl()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsUUID()
  storeId: string;
} 