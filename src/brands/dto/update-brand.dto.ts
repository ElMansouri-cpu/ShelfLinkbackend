import { IsString, IsOptional, IsUrl, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandDto {
  @ApiPropertyOptional({
    description: 'The name of the brand',
    example: 'Nike',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the brand',
    example: 'Just Do It - Leading sports and lifestyle brand',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the brand logo image',
    example: 'https://example.com/nike-logo.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Official website URL of the brand',
    example: 'https://www.nike.com',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Whether the brand is active and available for use',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 