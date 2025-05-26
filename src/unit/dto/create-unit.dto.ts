import { IsString, IsOptional } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
} 