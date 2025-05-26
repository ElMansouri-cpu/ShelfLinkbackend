import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;
} 