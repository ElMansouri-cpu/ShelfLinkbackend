import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { FilterConditionDto } from './filter-condition.dto';
import { SortConditionDto } from './sort-condition.dto';

export class QueryDto {
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters: FilterConditionDto[];

  @ValidateNested({ each: true })
  @Type(() => SortConditionDto)
  sorts: SortConditionDto[];

  @IsOptional()
  @IsString()
  search?: string;

}
