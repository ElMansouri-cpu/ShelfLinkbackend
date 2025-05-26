import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsNotEmpty()
  storeId: string;
} 