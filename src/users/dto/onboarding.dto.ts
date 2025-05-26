import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class OnboardingDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
} 