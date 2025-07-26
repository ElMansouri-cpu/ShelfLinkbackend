import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderDto } from './create-provider.dto';

export class UpdateProviderDto extends PartialType(CreateProviderDto) {
  // All fields from CreateProviderDto are now optional due to PartialType
  // No additional fields needed since location is already in CreateProviderDto
} 