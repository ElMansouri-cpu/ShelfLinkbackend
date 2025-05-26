import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsUUID()
  @IsOptional()
  storeId?: string;
} 