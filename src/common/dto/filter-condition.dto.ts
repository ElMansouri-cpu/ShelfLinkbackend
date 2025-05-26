import { IsIn, IsString } from 'class-validator';

export class FilterConditionDto {
  @IsString()
  column: string;

  @IsIn(['contains', 'equals', '=', '!=', 'startsWith', 'endsWith', 'starts with', 'ends with'])
  operator: string;

  @IsString()
  value: string;
}
